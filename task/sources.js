#!/usr/bin/env node

import { interactive } from './lib/pre.js';

import Meta from './lib/meta.js';
import os from 'os';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';
import { pipeline } from 'stream/promises';
import decompress from 'decompress';
import minimist from 'minimist';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));

const args = minimist(process.argv, {
    boolean: ['interactive'],
    alias: {
        interactive: 'i'
    }
});

if (import.meta.url === `file://${process.argv[1]}`) {
    if (args.interactive) {
        prompt();
    } else {
        cli();
    }
}

async function prompt() {
    await interactive([{
        type: 'text',
        message: 'OA BRANCH',
        name: 'OA_BRANCH',
        default: 'master'
    }]);

    return cli();
}

async function cli() {
    if (!process.env.OA_API) throw new Error('No OA_API env var defined');
    if (!process.env.OA_BRANCH) throw new Error('No OA_BRANCH env var defined');
    if (!process.env.SharedSecret) throw new Error('No SharedSecret env var defined');
    if (!process.env.StackName) process.env.StackName = 'local';
    if (!process.env.Bucket) process.env.Bucket = 'v2.openaddresses.io';

    const tmp = path.resolve(os.tmpdir(), Math.random().toString(36).substring(2, 15));
    console.error(`ok - ${tmp}`);
    fs.mkdirSync(tmp);

    const meta = new Meta();
    const OA = (await import('@openaddresses/lib')).default;
    const oa = new OA({
        url: process.env.OA_API,
        secret: process.env.SharedSecret
    });

    try {
        await meta.load();
        await meta.protection(true);

        console.error('ok - fetching repo');
        await fetch_repo(tmp);
        console.error('ok - extracted repo');

        console.error('ok - fetching latest sha');
        const sha = await get_sha();
        console.error(`ok - ${sha}`);

        console.error('ok - listing jobs');
        const jobs = list(tmp, sha);
        console.error(`ok - ${jobs.length} jobs found`);

        console.error('ok - creating run');
        const r = await oa.cmd('run', 'create', {
            live: true
        });
        console.error(`ok - run: ${r.id} created`);

        console.error('ok - populating run');
        await oa.cmd('run', 'create_jobs', {
            ':run': r.id,
            jobs
        });
        console.error('ok - run populated');

        await meta.protection(false);
    } catch (err) {
        console.error(err);
        await meta.protection(false);
        process.exit(1);
    }
}

async function fetch_repo(tmp) {
    await pipeline(
        (await fetch(`https://github.com/openaddresses/openaddresses/archive/${process.env.OA_BRANCH}.zip`)).body,
        fs.createWriteStream(path.resolve(tmp, 'openaddresses.zip'))
    );

    await decompress(path.resolve(tmp, 'openaddresses.zip'), path.resolve(tmp, 'openaddresses'));
}

function list(tmp, sha) {
    const dir = fs.readdirSync(path.resolve(tmp, 'openaddresses'))[0];
    const globs = globSync('**/*.json', {
        nodir: true,
        cwd: path.resolve(tmp, 'openaddresses', dir, 'sources')
    });

    const jobs = [];
    for (const glob of globs) {
        try {
            const source = JSON.parse(String(fs.readFileSync(path.resolve(tmp, 'openaddresses', dir, 'sources', glob))));
            if (source.schema !== 2) continue;

            for (const layer of Object.keys(source.layers)) {
                for (const name of source.layers[layer]) {
                    jobs.push({
                        source: `https://raw.githubusercontent.com/openaddresses/openaddresses/${sha}/sources/${glob}`,
                        layer: layer,
                        name: name.name
                    });
                }
            }
        } catch (err) {
            console.error(path.resolve(tmp, 'openaddresses', dir, 'sources', glob));
            console.error(err);
        }
    }

    return jobs;
}

async function get_sha() {
    const res = await fetch('https://api.github.com/repos/openaddresses/openaddresses/commits/master', {
        method: 'GET',
        headers: {
            'User-Agent': `OpenAddresses Task v${pkg.version}`
        }
    });

    if (res.status !== 200) throw new Error(await res.text());

    return (await res.json()).sha;
}
