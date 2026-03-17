<template>
    <div class='page-wrapper'>
        <div class='page-body'>
            <div class='container-xl'>
                <div class='card'>
                    <div class='card-header'>
                        <h3 class='card-title'>
                            Data Map
                        </h3>
                        <div class='ms-auto btn-list'>
                            <button
                                class='btn btn-sm'
                                :class='layers.borders ? "btn-primary" : "btn-outline-secondary"'
                                title='Toggle source coverage boundaries'
                                @click='toggle("borders")'
                            >
                                Coverage
                            </button>
                            <button
                                class='btn btn-sm'
                                :class='layers.addresses ? "btn-primary" : "btn-outline-secondary"'
                                title='Toggle address points'
                                @click='toggle("addresses")'
                            >
                                Addresses
                            </button>
                            <button
                                class='btn btn-sm'
                                :class='layers.buildings ? "btn-primary" : "btn-outline-secondary"'
                                title='Toggle building footprints'
                                @click='toggle("buildings")'
                            >
                                Buildings
                            </button>
                            <button
                                class='btn btn-sm'
                                :class='layers.parcels ? "btn-primary" : "btn-outline-secondary"'
                                title='Toggle parcel boundaries'
                                @click='toggle("parcels")'
                            >
                                Parcels
                            </button>
                            <button
                                class='btn btn-sm'
                                :class='layers.centerlines ? "btn-primary" : "btn-outline-secondary"'
                                title='Toggle road centerlines'
                                @click='toggle("centerlines")'
                            >
                                Centerlines
                            </button>
                        </div>
                    </div>
                    <div
                        ref='mapContainer'
                        style='height: 70vh;'
                    />
                </div>

                <div
                    v-if='inspect'
                    class='card mt-3'
                >
                    <div class='card-header'>
                        <h3 class='card-title'>
                            Feature Properties
                        </h3>
                        <div class='ms-auto'>
                            <button
                                class='btn btn-sm btn-outline-secondary'
                                @click='inspect = null'
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <div class='table-responsive'>
                        <table class='table table-vcenter card-table'>
                            <thead>
                                <tr>
                                    <th>Property</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td class='text-secondary'>Layer</td><td v-text='inspect.layer' /></tr>
                                <tr
                                    v-for='(value, key) in inspect.properties'
                                    :key='key'
                                >
                                    <td class='text-secondary' v-text='key' />
                                    <td v-text='value' />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import mapgl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';

const TILES_BASE = 'https://v2.openaddresses.io/fabric';

let map = null;
let protocol = null;

export default {
    name: 'FabricMap',
    data: function() {
        return {
            layers: {
                borders: true,
                addresses: true,
                buildings: false,
                parcels: false,
                centerlines: false
            },
            inspect: null
        };
    },
    unmounted: function() {
        if (map) {
            map.remove();
            map = null;
        }
    },
    mounted: async function() {
        this.$nextTick(async () => {
            await this.init();
        });
    },
    methods: {
        toggle: function(layer) {
            this.layers[layer] = !this.layers[layer];
            if (layer === 'borders') {
                map.setLayoutProperty('oa-borders-fill', 'visibility', this.layers.borders ? 'visible' : 'none');
                map.setLayoutProperty('oa-borders-line', 'visibility', this.layers.borders ? 'visible' : 'none');
            } else {
                map.setLayoutProperty(`oa-${layer}`, 'visibility', this.layers[layer] ? 'visible' : 'none');
            }
        },
        init: async function() {
            try {
                const res = await window.std('/api/map');

                if (!protocol) {
                    protocol = new Protocol();
                    mapgl.addProtocol('pmtiles', protocol.tile);
                }

                map = new mapgl.Map({
                    container: this.$refs.mapContainer,
                    hash: 'map',
                    center: [-96, 38],
                    zoom: 4,
                    style: 'https://api.protomaps.com/styles/v4/grayscale/en.json?key=' + res.protomaps_key
                });

                map.addControl(new mapgl.NavigationControl(), 'bottom-right');

                map.once('idle', () => {
                    map.addSource('borders', {
                        type: 'vector',
                        url: `pmtiles://${TILES_BASE}/borders.pmtiles`
                    });

                    map.addSource('addresses', {
                        type: 'vector',
                        url: `pmtiles://${TILES_BASE}/addresses.pmtiles`
                    });

                    map.addSource('buildings', {
                        type: 'vector',
                        url: `pmtiles://${TILES_BASE}/buildings.pmtiles`
                    });

                    map.addSource('parcels', {
                        type: 'vector',
                        url: `pmtiles://${TILES_BASE}/parcels.pmtiles`
                    });

                    map.addSource('centerlines', {
                        type: 'vector',
                        url: `pmtiles://${TILES_BASE}/centerlines.pmtiles`
                    });

                    map.addLayer({
                        id: 'oa-borders-fill',
                        type: 'fill',
                        source: 'borders',
                        'source-layer': 'data',
                        filter: ['==', ['geometry-type'], 'Polygon'],
                        paint: {
                            'fill-color': [
                                'case',
                                ['any',
                                    ['coalesce', ['get', 'addresses'], false],
                                    ['coalesce', ['get', 'buildings'], false],
                                    ['coalesce', ['get', 'parcels'], false],
                                    ['coalesce', ['get', 'centerlines'], false]
                                ],
                                '#0b6623',
                                '#cccccc'
                            ],
                            'fill-opacity': 0.3
                        }
                    });

                    map.addLayer({
                        id: 'oa-borders-line',
                        type: 'line',
                        source: 'borders',
                        'source-layer': 'data',
                        filter: ['==', ['geometry-type'], 'Polygon'],
                        paint: {
                            'line-color': [
                                'case',
                                ['any',
                                    ['coalesce', ['get', 'addresses'], false],
                                    ['coalesce', ['get', 'buildings'], false],
                                    ['coalesce', ['get', 'parcels'], false],
                                    ['coalesce', ['get', 'centerlines'], false]
                                ],
                                '#0b6623',
                                '#999999'
                            ],
                            'line-opacity': 0.5,
                            'line-width': 1
                        }
                    });

                    map.addLayer({
                        id: 'oa-parcels',
                        type: 'line',
                        source: 'parcels',
                        'source-layer': 'parcels',
                        layout: {
                            visibility: this.layers.parcels ? 'visible' : 'none'
                        },
                        paint: {
                            'line-color': '#e67e22',
                            'line-width': 1,
                            'line-opacity': 0.6
                        }
                    });

                    map.addLayer({
                        id: 'oa-buildings',
                        type: 'fill',
                        source: 'buildings',
                        'source-layer': 'buildings',
                        layout: {
                            visibility: this.layers.buildings ? 'visible' : 'none'
                        },
                        paint: {
                            'fill-color': '#8e44ad',
                            'fill-opacity': 0.4,
                            'fill-outline-color': '#8e44ad'
                        }
                    });

                    map.addLayer({
                        id: 'oa-centerlines',
                        type: 'line',
                        source: 'centerlines',
                        'source-layer': 'centerlines',
                        layout: {
                            visibility: this.layers.centerlines ? 'visible' : 'none'
                        },
                        paint: {
                            'line-color': '#c0392b',
                            'line-width': 1,
                            'line-opacity': 0.6
                        }
                    });

                    map.addLayer({
                        id: 'oa-addresses',
                        type: 'circle',
                        source: 'addresses',
                        'source-layer': 'addresses',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                8, 1,
                                12, 2,
                                15, 4
                            ],
                            'circle-color': '#2980b9',
                            'circle-opacity': 0.6
                        }
                    });

                    map.on('click', (e) => {
                        const features = map.queryRenderedFeatures(e.point, {
                            layers: ['oa-addresses', 'oa-buildings', 'oa-parcels', 'oa-centerlines', 'oa-borders-fill']
                        });

                        if (features.length > 0) {
                            const f = features[0];
                            this.inspect = {
                                layer: f.layer.id.replace(/^oa-/, '').replace(/-fill$/, ''),
                                properties: f.properties
                            };
                        } else {
                            this.inspect = null;
                        }
                    });

                    for (const id of ['oa-addresses', 'oa-buildings', 'oa-parcels', 'oa-centerlines', 'oa-borders-fill']) {
                        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
                        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
                    }
                });
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
};
</script>
