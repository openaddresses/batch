import fs from 'fs';
import Err from '@openaddresses/batch-error';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

/**
 * @class
 */
export class Status {
    static list() {
        return JSON.parse(fs.readFileSync(new URL('../schema/util/status.json', import.meta.url))).enum;
    }

    static verify(statuses) {
        const list = Status.list();

        for (const status of statuses) {
            if (!list.includes(status)) {
                throw new Err(400, null, 'Invalid status param');
            }
        }
    }
}

export async function explode(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': `OpenAddresses v${pkg.version}`
        },
        method: 'GET'
    });

    const source = await res.json();

    const jobs = [];

    if (!source.schema || source.schema !== 2) {
        throw new Error('Job is not schema v2');
    } else if (!source.layers) {
        throw new Error('Job does not have layers array');
    }

    const layers = Object.keys(source.layers);
    for (const layer of layers) {
        for (const j of source.layers[layer]) {
            jobs.push({
                source: url,
                layer: layer,
                name: j.name
            });
        }
    }

    return jobs;
}
