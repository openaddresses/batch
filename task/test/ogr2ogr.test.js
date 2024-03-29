import test from 'tape';
import CP from 'child_process';

test('ogr2ogr installed', (t) => {

    const ogr = String(CP.execSync('ogr2ogr --version'));
    t.ok(ogr.match(/GDAL [0-9]+\.[0-9]+\.[0-9]+/), 'GDAL <version>');

    t.end();
});
