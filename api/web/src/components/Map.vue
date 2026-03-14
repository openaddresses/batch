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
                                @click='toggle("borders")'
                            >
                                Coverage
                            </button>
                            <button
                                class='btn btn-sm'
                                :class='layers.addresses ? "btn-primary" : "btn-outline-secondary"'
                                @click='toggle("addresses")'
                            >
                                Addresses
                            </button>
                            <button
                                class='btn btn-sm'
                                :class='layers.buildings ? "btn-primary" : "btn-outline-secondary"'
                                @click='toggle("buildings")'
                            >
                                Buildings
                            </button>
                            <button
                                class='btn btn-sm'
                                :class='layers.parcels ? "btn-primary" : "btn-outline-secondary"'
                                @click='toggle("parcels")'
                            >
                                Parcels
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
                parcels: false
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
                map.setLayoutProperty('borders-fill', 'visibility', this.layers.borders ? 'visible' : 'none');
                map.setLayoutProperty('borders-line', 'visibility', this.layers.borders ? 'visible' : 'none');
            } else {
                map.setLayoutProperty(layer, 'visibility', this.layers[layer] ? 'visible' : 'none');
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

                    map.addLayer({
                        id: 'borders-fill',
                        type: 'fill',
                        source: 'borders',
                        'source-layer': 'data',
                        filter: ['==', ['geometry-type'], 'Polygon'],
                        paint: {
                            'fill-color': '#0b6623',
                            'fill-opacity': 0.3
                        }
                    });

                    map.addLayer({
                        id: 'borders-line',
                        type: 'line',
                        source: 'borders',
                        'source-layer': 'data',
                        filter: ['==', ['geometry-type'], 'Polygon'],
                        paint: {
                            'line-color': '#0b6623',
                            'line-opacity': 0.5,
                            'line-width': 1
                        }
                    });

                    map.addLayer({
                        id: 'parcels',
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
                        id: 'buildings',
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
                        id: 'addresses',
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
                            layers: ['addresses', 'buildings', 'parcels', 'borders-fill']
                        });

                        if (features.length > 0) {
                            const f = features[0];
                            this.inspect = {
                                layer: f.layer.id === 'borders-fill' ? 'borders' : f.layer.id,
                                properties: f.properties
                            };
                        } else {
                            this.inspect = null;
                        }
                    });

                    map.on('mouseenter', 'addresses', () => { map.getCanvas().style.cursor = 'pointer'; });
                    map.on('mouseleave', 'addresses', () => { map.getCanvas().style.cursor = ''; });
                    map.on('mouseenter', 'buildings', () => { map.getCanvas().style.cursor = 'pointer'; });
                    map.on('mouseleave', 'buildings', () => { map.getCanvas().style.cursor = ''; });
                    map.on('mouseenter', 'parcels', () => { map.getCanvas().style.cursor = 'pointer'; });
                    map.on('mouseleave', 'parcels', () => { map.getCanvas().style.cursor = ''; });
                    map.on('mouseenter', 'borders-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
                    map.on('mouseleave', 'borders-fill', () => { map.getCanvas().style.cursor = ''; });
                });
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
};
</script>
