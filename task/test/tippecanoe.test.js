import test from 'tape';
import { parseProcStatus } from '../lib/tippecanoe.js';

test('parseProcStatus reads resident and peak resident memory in kB', (t) => {
    const status = [
        'Name:\ttippecanoe',
        'VmPeak:\t 9000000 kB',
        'VmHWM:\t 4200000 kB',
        'VmRSS:\t 3100000 kB',
        'Threads:\t8'
    ].join('\n');

    t.deepEquals(parseProcStatus(status), { rssKb: 3100000, peakKb: 4200000 });
    t.end();
});

test('parseProcStatus returns nulls for fields it cannot find', (t) => {
    t.deepEquals(parseProcStatus('Name:\ttippecanoe\nThreads:\t8\n'), { rssKb: null, peakKb: null });
    t.deepEquals(parseProcStatus(''), { rssKb: null, peakKb: null });
    t.end();
});
