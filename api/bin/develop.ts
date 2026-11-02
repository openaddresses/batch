#!/usr/bin/env node
import fs from 'node:fs/promises';
import { execFile, spawn, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

/**
 * Start the API dev server, optionally against a fresh copy of a deployed database
 *
 * Usage:
 *    npm run dev                          # start against the local database
 *    npm run dev -- --dump [stack]        # pg_dump the deployed database, restore it locally, then start
 *
 * Options:
 *    --dump                     Dump the deployed database and restore it into --postgres before starting
 *    --profile <aws-profile>    AWS profile (default: .deploy profile)
 *    --region <aws-region>      AWS region (default: us-east-1)
 *    --postgres <uri>           Local database to restore into and run against
 *                               (default: postgres://postgres@localhost:5432/openaddresses)
 *    --keep-tokens              Keep users_tokens and users_reset rows from the deployed database
 *    --show-url                 Print the deployed database URL and exit
 *    --no-start                 Exit after the restore instead of starting the dev server
 *
 * The dump is written to api/batch-<stack>.dump and left in place for inspection.
 * The deployed instance is publicly reachable, so no bastion or tunnel is required.
 */

const DEFAULT_STACK = 'prod';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_POSTGRES = 'postgres://postgres@localhost:5432/openaddresses';

const execFileAsync = promisify(execFile);

const apiDir = fileURLToPath(new URL('../', import.meta.url));
const root = path.join(apiDir, '..');

const { values: opts, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
        'dump': { type: 'boolean' },
        'profile': { type: 'string' },
        'region': { type: 'string' },
        'postgres': { type: 'string' },
        'keep-tokens': { type: 'boolean' },
        'show-url': { type: 'boolean' },
        'no-start': { type: 'boolean' },
        'help': { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
});

if (opts.help) {
    console.log('Usage: npm run dev -- [stack] [--dump] [--profile <aws-profile>] [--region <aws-region>] [--postgres <uri>] [--keep-tokens] [--show-url] [--no-start]');
    console.log('');
    console.log(`  --dump         pg_dump the deployed database (default stack: ${DEFAULT_STACK}) and restore it into --postgres before starting`);
    console.log(`  --postgres     Local database URI. Defaults to ${DEFAULT_POSTGRES}`);
    console.log('  --keep-tokens  Keep users_tokens and users_reset rows; they are truncated after a restore by default');
    console.log('  --show-url     Print the deployed database URL and exit');
    console.log('  --no-start     Exit after the restore instead of starting the dev server');
    process.exit(0);
}

if (positionals.length > 1) fail(`unexpected arguments: ${positionals.slice(1).join(' ')}`);

const stack = positionals[0] || DEFAULT_STACK;
const showUrl = !!opts['show-url'];
const postgres = opts.postgres || process.env.POSTGRES || DEFAULT_POSTGRES;

const env: NodeJS.ProcessEnv = {
    ...process.env,
    POSTGRES: postgres,
};
delete env.ELECTRON_RUN_AS_NODE;

if (opts.dump || showUrl) {
    const deploy = JSON.parse(await fs.readFile(path.join(root, '.deploy'), 'utf8')) as { profile?: string; region?: string };
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as { name: string };

    const fullStack = `${pkg.name}-${stack}`;
    const region = opts.region || process.env.AWS_REGION || deploy.region || DEFAULT_REGION;
    const profile = opts.profile || process.env.AWS_PROFILE || deploy.profile;

    if (!profile) fail(`no profile for ${stack}: set .profile in .deploy or pass --profile`);

    log(`Stack: ${fullStack}`);
    log(`Profile: ${profile}`);
    log(`Region: ${region}`);

    const remote = (await run('aws', [
        'cloudformation', 'describe-stacks',
        '--stack-name', fullStack,
        '--query', 'Stacks[0].Outputs[?OutputKey==\'DB\'].OutputValue',
        '--output', 'text',
        '--profile', profile,
        '--region', region,
    ])).trim();

    if (!remote.startsWith('postgres')) fail(`${fullStack} has no DB Output`);

    if (showUrl) {
        console.log(remote);
        process.exit(0);
    }

    env.AWS_PROFILE = env.AWS_PROFILE || profile;
    env.AWS_REGION = env.AWS_REGION || region;

    const dump = path.join(apiDir, `batch-${stack}.dump`);

    log(`Dumping ${fullStack} to ${path.relative(root, dump)}`);

    // Owners & grants reference roles that only exist on the deployed database
    pg('pg_dump', remote, ['--no-owner', '--no-privileges', '--format=custom', '--file', dump], 'pg_dump failed');

    const stat = await fs.stat(dump).catch(() => null);
    if (!stat || stat.size === 0) fail(`${dump} is missing or empty`);

    const local = new URL(postgres);
    const dbname = local.pathname.replace(/^\//, '');

    log(`Restoring into ${dbname} on ${local.hostname}:${local.port || 5432}`);

    pg('dropdb', postgres, ['--if-exists', dbname], `dropdb ${dbname} failed`, true);
    pg('createdb', postgres, [dbname], `createdb ${dbname} failed`, true);

    // pg_restore exits 1 for ignorable errors such as COMMENT ON EXTENSION, so the
    // outcome is checked by querying the restored data instead
    pg('pg_restore', postgres, ['--no-owner', '--no-privileges', '--dbname', dbname, dump]);

    const results = pg('psql', postgres, ['--tuples-only', '--no-align', '--command', 'SELECT count(*) FROM results'], 'restored database has no results table', false, true).trim();
    log(`ok - restored ${results} results rows`);

    if (!opts['keep-tokens']) {
        pg('psql', postgres, ['--quiet', '--command', 'TRUNCATE users_tokens, users_reset'], 'failed to truncate token tables');
        log('ok - truncated users_tokens and users_reset (pass --keep-tokens to retain them)');
    }

    if (opts['no-start']) process.exit(0);
}

log(`Starting API against ${postgres.replace(/:[^:@/]+@/, ':***@')}`);

const child = spawn(path.join(apiDir, 'node_modules', '.bin', 'tsx'), ['watch', '--exclude', './web', 'index.ts'], {
    cwd: apiDir,
    env,
    stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
    process.exitCode = code || (signal ? 1 : 0);
});

/**
 * Run a libpq client with the connection split out of the URI so the password
 * travels in PGPASSWORD rather than on the command line
 */
function pg(cmd: string, uri: string, args: string[], error?: string, maintenance = false, capture = false): string {
    const url = new URL(uri);

    const conn = [
        '--host', url.hostname,
        '--port', url.port || '5432',
        '--username', decodeURIComponent(url.username || 'postgres'),
    ];

    if (!maintenance && (cmd === 'pg_dump' || cmd === 'psql')) {
        conn.push('--dbname', url.pathname.replace(/^\//, ''));
    }

    const res = spawnSync(cmd, [...conn, ...args], {
        cwd: apiDir,
        stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
        encoding: 'utf8',
        env: {
            ...process.env,
            PGPASSWORD: decodeURIComponent(url.password || ''),
            PGSSLMODE: url.searchParams.get('sslmode') || (url.hostname.endsWith('.rds.amazonaws.com') ? 'require' : 'prefer'),
        },
    });

    if (res.error) fail(`${cmd} could not be started: ${res.error.message}`);

    if (res.status !== 0) {
        if (error) fail(error);
        log(`${cmd} exited ${res.status}; continuing`);
    }

    return res.stdout || '';
}

async function run(cmd: string, args: string[]): Promise<string> {
    try {
        const { stdout } = await execFileAsync(cmd, args, { maxBuffer: 64 * 1024 * 1024 });
        return stdout;
    } catch (err) {
        const stderr = err && typeof err === 'object' && 'stderr' in err ? String(err.stderr).trim() : '';
        return fail(`${cmd} ${args[0]} failed${stderr ? `: ${stderr}` : ''}`);
    }
}

function log(message: string): void {
    if (!showUrl) console.log(message);
}

function fail(message: string): never {
    console.error(`not ok - ${message}`);
    process.exit(1);
}
