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
            const vis = this.layers[layer] ? 'visible' : 'none';
            map.setLayoutProperty(`oa-${layer}`, 'visibility', vis);
            map.setLayoutProperty(`oa-${layer}-borders-fill`, 'visibility', vis);
            map.setLayoutProperty(`oa-${layer}-borders-line`, 'visibility', vis);
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

                    const borderColors = {
                        addresses: '#2980b9',
                        buildings: '#8e44ad',
                        parcels: '#e67e22',
                        centerlines: '#c0392b'
                    };

                    for (const [layer, color] of Object.entries(borderColors)) {
                        map.addLayer({
                            id: `oa-${layer}-borders-fill`,
                            type: 'fill',
                            source: 'borders',
                            'source-layer': 'data',
                            filter: ['all',
                                ['==', ['geometry-type'], 'Polygon'],
                                ['coalesce', ['get', layer], false]
                            ],
                            layout: {
                                visibility: this.layers[layer] ? 'visible' : 'none'
                            },
                            paint: {
                                'fill-color': color,
                                'fill-opacity': 0.15
                            }
                        });

                        map.addLayer({
                            id: `oa-${layer}-borders-line`,
                            type: 'line',
                            source: 'borders',
                            'source-layer': 'data',
                            filter: ['all',
                                ['==', ['geometry-type'], 'Polygon'],
                                ['coalesce', ['get', layer], false]
                            ],
                            layout: {
                                visibility: this.layers[layer] ? 'visible' : 'none'
                            },
                            paint: {
                                'line-color': color,
                                'line-opacity': 0.4,
                                'line-width': 1
                            }
                        });
                    }

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

                    const interactiveLayers = [
                        'oa-addresses', 'oa-buildings', 'oa-parcels', 'oa-centerlines',
                        'oa-addresses-borders-fill', 'oa-buildings-borders-fill',
                        'oa-parcels-borders-fill', 'oa-centerlines-borders-fill'
                    ];

                    map.on('click', (e) => {
                        const features = map.queryRenderedFeatures(e.point, {
                            layers: interactiveLayers
                        });

                        if (features.length > 0) {
                            const f = features[0];
                            this.inspect = {
                                layer: f.layer.id.replace(/^oa-/, '').replace(/-borders-fill$/, ''),
                                properties: f.properties
                            };
                        } else {
                            this.inspect = null;
                        }
                    });

                    for (const id of interactiveLayers) {
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
