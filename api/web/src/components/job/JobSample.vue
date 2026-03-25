<template>
    <div class='col-12'>
        <template v-if='job.pmtiles_url'>
            <div
                ref='sampleMap'
                class='w-100 round'
                style='height: 400px;'
            />
            <div
                v-if='job.output.preview'
                class='text-center mt-1 mb-2'
            >
                <a
                    :href='local ? `http://localhost:4999/api/job/${job.id}/output/source.png` : `/api/job/${job.id}/output/source.png`'
                    target='_blank'
                >
                    View static preview image
                </a>
            </div>
        </template>
        <template v-else-if='job.output.preview'>
            <img
                class='round w-full'
                :src='local ? `http://localhost:4999/api/job/${job.id}/output/source.png` : `/api/job/${job.id}/output/source.png`'
            >
        </template>
        <template v-else>
            <div class='border rounded'>
                <div class='d-flex justify-content-center my-4'>
                    <IconInfoCircle size='40' />
                </div>

                <div class='text-center'>
                    <h3 class=''>
                        No Preview Image Found
                    </h3>
                </div>
            </div>
        </template>

        <div class='card-header'>
            <h3 class='card-title'>
                Job Sample
            </h3>

            <div class='ms-auto btn-list'>
                <button
                    v-if='mode !== "props"'
                    class='btn'
                    @click='mode = "props"'
                >
                    Table
                </button>
                <button
                    v-if='mode !== "raw"'
                    class='btn'
                    @click='mode = "raw"'
                >
                    Raw
                </button>
            </div>
        </div>


        <TablerLoading
            v-if='loading'
            desc='Loading Sample Data'
        />
        <TablerNone
            v-else-if='!sample.length'
            :create='false'
        />
        <template v-else-if='mode === "props"'>
            <table class='table table-hover table-vcenter card-table'>
                <thead>
                    <tr>
                        <th
                            v-for='key of props'
                            :key='key'
                            v-text='key'
                        />
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for='s of sample'
                        :key='s.properties.hash'
                    >
                        <th
                            v-for='key of props'
                            :key='s.properties.hash + ":" + key'
                            v-text='s.properties[key]'
                        />
                    </tr>
                </tbody>
            </table>
        </template>
        <template v-else-if='mode === "raw"'>
            <pre v-text='sample.map(s => JSON.stringify(s)).join("\n")' />
        </template>
    </div>
</template>

<script>
import {
    IconInfoCircle
} from '@tabler/icons-vue';
import {
    TablerLoading,
    TablerNone
} from '@tak-ps/vue-tabler';
import mapgl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol, PMTiles } from 'pmtiles';

let map = null;
let protocol = null;

export default {
    name: 'JobSample',
    components: {
        TablerLoading,
        TablerNone,
        IconInfoCircle
    },
    props: ['job'],
    data: function() {
        return {
            local: window.location.hostname === 'localhost',
            mode: 'props',
            loading: true,
            props: [],
            sample: [],
        };
    },
    mounted: function() {
        this.getSample();
        if (this.job.pmtiles_url) {
            this.$nextTick(() => {
                this.initMap();
            });
        }
    },
    unmounted: function() {
        if (map) {
            map.remove();
            map = null;
        }
    },
    methods: {
        initMap: async function() {
            try {
                const res = await window.std('/api/map');

                if (!protocol) {
                    protocol = new Protocol();
                    mapgl.addProtocol('pmtiles', protocol.tile);
                }

                const pmtilesUrl = this.job.pmtiles_url;

                // Read bounds from PMTiles header
                const p = new PMTiles(pmtilesUrl);
                const header = await p.getHeader();

                map = new mapgl.Map({
                    container: this.$refs.sampleMap,
                    bounds: [[header.minLon, header.minLat], [header.maxLon, header.maxLat]],
                    fitBoundsOptions: { padding: 20 },
                    style: 'https://api.protomaps.com/styles/v4/grayscale/en.json?key=' + res.protomaps_key
                });

                map.addControl(new mapgl.NavigationControl(), 'bottom-right');

                map.once('load', () => {
                    map.addSource('job-data', {
                        type: 'vector',
                        url: `pmtiles://${pmtilesUrl}`
                    });

                    // Points (addresses)
                    map.addLayer({
                        id: 'job-data-circle',
                        type: 'circle',
                        source: 'job-data',
                        'source-layer': 'data',
                        filter: ['==', ['geometry-type'], 'Point'],
                        paint: {
                            'circle-radius': 3,
                            'circle-color': '#0b6623',
                            'circle-opacity': 0.6
                        }
                    });

                    // Polygons fill (parcels/buildings)
                    map.addLayer({
                        id: 'job-data-fill',
                        type: 'fill',
                        source: 'job-data',
                        'source-layer': 'data',
                        filter: ['==', ['geometry-type'], 'Polygon'],
                        paint: {
                            'fill-color': '#0b6623',
                            'fill-opacity': 0.3
                        }
                    });

                    // Polygons outline
                    map.addLayer({
                        id: 'job-data-line-poly',
                        type: 'line',
                        source: 'job-data',
                        'source-layer': 'data',
                        filter: ['==', ['geometry-type'], 'Polygon'],
                        paint: {
                            'line-color': '#0b6623',
                            'line-opacity': 0.6,
                            'line-width': 1
                        }
                    });

                    // Lines (centerlines)
                    map.addLayer({
                        id: 'job-data-line',
                        type: 'line',
                        source: 'job-data',
                        'source-layer': 'data',
                        filter: ['==', ['geometry-type'], 'LineString'],
                        paint: {
                            'line-color': '#0b6623',
                            'line-opacity': 0.6,
                            'line-width': 2
                        }
                    });

                    // Click to inspect
                    const layerIds = ['job-data-circle', 'job-data-fill', 'job-data-line-poly', 'job-data-line'];

                    map.on('click', (e) => {
                        const features = map.queryRenderedFeatures(e.point, { layers: layerIds });

                        if (features.length > 0) {
                            const f = features[0];
                            const props = f.properties;

                            let html = '<table style="font-size: 12px; border-collapse: collapse;">';
                            for (const [key, value] of Object.entries(props)) {
                                html += `<tr><td style="padding: 2px 6px; font-weight: bold; color: #666;">${key}</td><td style="padding: 2px 6px;">${value}</td></tr>`;
                            }
                            html += '</table>';

                            new mapgl.Popup({ maxWidth: '400px' })
                                .setLngLat(e.lngLat)
                                .setHTML(html)
                                .addTo(map);
                        }
                    });

                    for (const id of layerIds) {
                        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
                        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
                    }
                });
            } catch (err) {
                this.$emit('err', err);
            }
        },
        getSample: async function() {
            try {
                this.loading = true;
                const res = await window.std(`/api/job/${this.$route.params.jobid}/output/sample`);
                const props = {};
                for (const r of res) {
                    for (const key of Object.keys(r.properties)) {
                        props[key] = true;
                    }
                }

                this.props = Object.keys(props);
                this.sample = res;
                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
