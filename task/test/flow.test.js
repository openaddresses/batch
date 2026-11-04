import test from 'tape';
import { flow, Job } from '../task.js';

Job.RETRY_DELAY = 1;
delete process.env.AWS_BATCH_JOB_ID;

function harness(overrides = {}) {
    const calls = [];
    const oa = {
        cmd: async (cmd, subcmd, body) => {
            calls.push({ cmd, subcmd, body });
            const key = `${cmd}:${subcmd}`;
            if (overrides[key]) return overrides[key](body, calls);
            if (key === 'job:get') return { run: 5, source: 'us/dc/statewide', layer: 'parcels', name: 'city' };
            if (key === 'run:get') return { id: 5, live: true };
            if (key === 'job:raw') return { schema: 2, coverage: {}, layers: { parcels: [{ name: 'city', conform: { bogus: true } }] } };
            return body;
        }
    };

    const exits = [];
    const exit = process.exit;
    process.exit = (code) => { exits.push(code); };

    return {
        job: new Job(oa, 1),
        calls,
        exits,
        restore: () => { process.exit = exit; }
    };
}

test('flow: schema failure marks the job Fail and files a joberror on a live run', async (t) => {
    const h = harness();

    await flow(h.job);
    h.restore();

    const updates = h.calls.filter((c) => c.cmd === 'job' && c.subcmd === 'update').map((c) => c.body.status);
    t.deepEquals(updates, ['Running', 'Fail'], 'job moves Running -> Fail');

    const errs = h.calls.filter((c) => c.cmd === 'joberror');
    t.equals(errs.length, 1, 'one joberror filed');
    t.equals(errs[0].body.job, 1);
    t.ok(/Source does not conform to V2 schema/.test(errs[0].body.message), 'joberror carries the schema error');

    t.deepEquals(h.exits, [1], 'process exits 1');
    t.end();
});

test('flow: no joberror on a non-live run', async (t) => {
    const h = harness({ 'run:get': () => ({ id: 5, live: false }) });

    await flow(h.job);
    h.restore();

    const updates = h.calls.filter((c) => c.cmd === 'job' && c.subcmd === 'update').map((c) => c.body.status);
    t.deepEquals(updates, ['Running', 'Fail']);
    t.equals(h.calls.filter((c) => c.cmd === 'joberror').length, 0, 'no joberror filed');
    t.end();
});

test('flow: Fail status update is retried through transient API errors', async (t) => {
    let fails = 2;
    const h = harness({
        'job:update': (body) => {
            if (body.status === 'Fail' && fails-- > 0) throw new Error('503 Service Unavailable');
            return body;
        }
    });

    await flow(h.job);
    h.restore();

    const updates = h.calls.filter((c) => c.cmd === 'job' && c.subcmd === 'update' && c.body.status === 'Fail');
    t.equals(updates.length, 3, 'Fail update attempted until it succeeds');
    t.equals(h.calls.filter((c) => c.cmd === 'joberror').length, 1, 'joberror still filed after retries');
    t.deepEquals(h.exits, [1]);
    t.end();
});

test('flow: run lookup failure before the schema check still resolves live state for the joberror', async (t) => {
    let runCalls = 0;
    const h = harness({
        'run:get': () => {
            runCalls++;
            if (runCalls === 1) throw new Error('504 Gateway Timeout');
            return { id: 5, live: true };
        }
    });

    await flow(h.job);
    h.restore();

    const updates = h.calls.filter((c) => c.cmd === 'job' && c.subcmd === 'update').map((c) => c.body.status);
    t.deepEquals(updates, ['Running', 'Fail']);
    t.equals(h.calls.filter((c) => c.cmd === 'joberror').length, 1, 'joberror filed after re-fetching the run');
    t.end();
});
