declare module 'split' {
    import type { Transform } from 'node:stream';
    export default function split(matcher?: unknown): Transform;
}

declare module 'express-minify' {
    import type { RequestHandler } from 'express';
    export default function minify(options?: Record<string, unknown>): RequestHandler;
}

// The test suite calls assert.ifError(value, message) - Node's runtime ignores
// the extra message argument, so widen the type to match established usage.
declare module 'assert' {
    function ifError(value: unknown, message?: unknown): asserts value is null | undefined;
}

declare module 'parallel-transform' {
    import type { Transform } from 'node:stream';
    export default function transform(
        concurrency: number,
        transform: (data: string, callback: (err: Error | null, data?: string) => void) => void,
    ): Transform;
}

declare module '@mapbox/sphericalmercator' {
    export default class SphericalMercator {
        constructor(options?: { size?: number; antimeridian?: boolean });
        bbox(x: number, y: number, zoom: number, tms_style?: boolean, srs?: string): [number, number, number, number];
        xyz(bbox: number[], zoom: number, tms_style?: boolean, srs?: string): { minX: number; minY: number; maxX: number; maxY: number };
    }
}

declare module '@turf/area' {
    import type { Feature, FeatureCollection, Geometry } from 'geojson';
    export default function area(geojson: Feature | FeatureCollection | Geometry): number;
}

declare module '@turf/difference' {
    import type { Feature, Polygon, MultiPolygon } from 'geojson';
    export default function difference(
        polygon1: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon,
        polygon2: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon,
    ): Feature<Polygon | MultiPolygon> | null;
}

declare module 'busboy' {
    import type { Readable, Writable } from 'node:stream';
    import type { IncomingHttpHeaders } from 'node:http';

    interface FileInfo {
        filename: string;
        encoding: string;
        mimeType: string;
    }

    interface Busboy extends Writable {
        on(event: 'file', listener: (fieldname: string, file: Readable, info: FileInfo) => void): this;
        on(event: 'close', listener: () => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: string, listener: (...args: unknown[]) => void): this;
    }

    export default function busboy(config: { headers: IncomingHttpHeaders; [k: string]: unknown }): Busboy;
}
