import { fetch } from 'undici';
import fs from 'fs';
import Err from '@openaddresses/batch-error';
import { StatusValues } from './types.js';

const pkg: { version: string } = JSON.parse(String(fs.readFileSync(new URL('../package.json', import.meta.url))));

export interface ExplodedJob {
    source: string;
    layer: string;
    name: string;
    license?: Record<string, unknown>;
}

interface SourceLayerEntry {
    name: string;
    license?: Record<string, unknown>;
    website?: string;
}

interface SourceDefinition {
    schema?: number;
    layers?: Record<string, SourceLayerEntry[]>;
}

/**
 * @class
 */
export class Status {
    static list(): string[] {
        return [...StatusValues];
    }

    static verify(statuses: string[]): void {
        const list = Status.list();

        for (const status of statuses) {
            if (!list.includes(status)) {
                throw new Err(400, null, 'Invalid status param');
            }
        }
    }
}

export async function explode(url: string): Promise<ExplodedJob[]> {
    const res = await fetch(url, {
        headers: {
            'User-Agent': `OpenAddresses v${pkg.version}`,
        },
        method: 'GET',
    });

    const source = await res.json() as SourceDefinition;

    const jobs: ExplodedJob[] = [];

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
                name: j.name,
                license: (j.license && typeof j.license === 'object') ? { ...j.license, website: j.website } : undefined,
            });
        }
    }

    return jobs;
}
