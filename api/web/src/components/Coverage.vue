<template>
    <div class='col col--12' :class='{ h300: !fullscreen, h600: fullscreen }'>
        <div class='col col--12' :class='{ absolute: fullscreen, right: fullscreen, left: fullscreen }'>
            <div class='col col--12 relative'>
                <div class='absolute top right z1'>
                    <button @click='setFull' class='btn round btn--stroke fr color-gray bg-white my12 mx12'>
                        <svg v-if='!fullscreen' class='icon'><use href='#icon-fullscreen'/></svg>
                        <svg v-else class='icon'><use href='#icon-shrink'/></svg>
                    </button>
                </div>

                <div v-if='point' class='absolute top left z1'>
                    <button @click='point = false' class='btn round btn--stroke fr color-gray bg-white my12 mx12 px6 py0'>
                        <span><svg class='icon fl h24'><use href='#icon-close'/></svg> Clear Filter</span>
                    </button>
                </div>

                <div id="map" class='w-full' :class='{ h300: !fullscreen, h600: fullscreen }'></div>
            </div>
        </div>
    </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default {
    name: 'Coverage',
    props: ['layer', 'filter', 'bbox'],
    data: function() {
        return {
            layers: ['addresses', 'parcels', 'buildings'],
            fullscreen: false,
            point: false,
            map: ''
        }
    },
    watch: {
        layer: function() {
            for (const layer of this.layers) {
                this.map.setLayoutProperty(`coverage-${layer}-poly`, 'visibility', 'none');
                this.map.setLayoutProperty(`coverage-${layer}-point`, 'visibility', 'none');
            }

            if (this.layer !== 'all') {
                this.map.setLayoutProperty('coverage-poly', 'visibility', 'none');
                this.map.setLayoutProperty('coverage-point', 'visibility', 'none');

                this.map.setLayoutProperty(`coverage-${this.layer}-poly`, 'visibility', 'visible');
                this.map.setLayoutProperty(`coverage-${this.layer}-point`, 'visibility', 'visible');
            } else {
                this.map.setLayoutProperty('coverage-poly', 'visibility', 'visible');
                this.map.setLayoutProperty('coverage-point', 'visibility', 'visible');
            }

        },
        point: function() {
            if (!this.point) {
                this.map.getSource('click').setData({
                    type: 'FeatureCollection',
                    features: []
                });
            } else {
                this.map.getSource('click').setData({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Point',
                        coordinates: this.point
                    }
                });
            }
            this.$emit('point', this.point);
        }
    },
    mounted: function() {
        this.init();
    },
    methods: {
        setFull: function() {
            this.fullscreen = !this.fullscreen;
            this.$nextTick(() => {
                this.map.resize();
            });
        },
        init: async function() {
            try {
                const res = await window.std('/api/map');
                mapboxgl.accessToken = res.token;

                const opts = {
                    container: 'map',
                    style: 'mapbox://styles/mapbox/light-v9'
                };

                if (this.bbox) opts.bounds = this.bbox;

                this.map = new mapboxgl.Map(opts);

                this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

                this.map.on('load', () => {
                    this.map.addSource('coverage', {
                        type: 'vector',
                        tiles: [
                            `${window.location.origin}/api/map/{z}/{x}/{y}.mvt`
                        ],
                        minzoom: 0,
                        maxzoom: 6
                    });

                    this.map.on('click', (e) => {
                        this.point = [ e.lngLat.lng, e.lngLat.lat ]
                    });

                    const base = '#0b6623';

                    this.map.addLayer({
                        id: `coverage-poly`,
                        type: 'fill',
                        source: 'coverage',
                        'source-layer': 'data',
                        layout: { },
                        filter: [
                            "all",
                            ['==', ['geometry-type'], 'Polygon'],
                            [
                                'any',
                                ["==", ['get', 'addresses'], true],
                                ["==", ['get', 'buildings'], true],
                                ["==", ['get', 'parcels'], true],
                            ]
                        ],
                        paint: {
                            'fill-color': base,
                            'fill-opacity': 0.8
                        }
                    });

                    this.map.addLayer({
                        id: `coverage-point`,
                        type: 'circle',
                        source: 'coverage',
                        'source-layer': 'data',
                        layout: { },
                        filter: ['==', ['geometry-type'], 'Point'],
                        paint: {
                            'circle-color': base,
                            'circle-radius': [
                                'interpolate',
                                ['exponential', 0.5],
                                ['zoom'],
                                1, 1,
                                10, 2,
                                13, 10,
                                15, 50,
                                17, 100
                            ],
                            'circle-opacity': 1.0,
                        }
                    });

                    for (const layer of ['coverage-poly', 'coverage-point']) {
                        if (this.filter) {
                            this.map.setFilter(layer, [
                                '==',
                                ['id'],
                                parseInt(this.filter)
                            ]);
                        }
                    }

                    for (const layer of ['addresses', 'parcels', 'buildings']) {
                        this.map.addLayer({
                            id: `coverage-${layer}-poly`,
                            type: 'fill',
                            source: 'coverage',
                            'source-layer': 'data',
                            layout: {
                                visibility: 'none'
                            },
                            filter: [
                                "all",
                                ["==", ['get', layer], true],
                                ['==', ['geometry-type'], 'Polygon'],
                            ],
                            paint: {
                                'fill-color': base,
                                'fill-opacity': 0.8
                            }
                        });

                        this.map.addLayer({
                            id: `coverage-${layer}-point`,
                            type: 'circle',
                            source: 'coverage',
                            'source-layer': 'data',
                            layout: {
                                visibility: 'none'
                            },
                            filter: [
                                "all",
                                ["==", ['get', layer], true],
                                ['==', ['geometry-type'], 'Point'],
                            ],
                            paint: {
                                'circle-color': base,
                                'circle-radius': [
                                    'interpolate',
                                    ['exponential', 0.5],
                                    ['zoom'],
                                    1, 1,
                                    10, 2,
                                    13, 10,
                                    15, 50,
                                    17, 100
                                ],
                                'circle-opacity': 1.0,
                                'circle-stroke-color': '#ffffff',
                                'circle-stroke-width': 1
                            }
                        });

                        if (this.filter) {
                            this.map.setFilter(`coverage-${layer}-poly`, [
                                '==',
                                ['id'],
                                parseInt(this.filter)
                            ]);

                            this.map.setFilter(`coverage-${layer}-point`, [
                                '==',
                                ['id'],
                                parseInt(this.filter)
                            ]);
                        }
                    }

                    this.map.addLayer({
                        id: `borders`,
                        type: 'line',
                        source: 'coverage',
                        'source-layer': 'data',
                        layout: { },
                        filter: ['==', ['geometry-type'], 'Polygon'],
                        paint: {
                            'line-color': 'rgba(0, 0, 0, 0.1)',
                            'line-width': 1
                        }
                    });

                    this.map.addLayer({
                        'id': 'borders-label',
                        'type': 'symbol',
                        'minzoom': 7,
                        'source-layer': 'data',
                        'source': 'coverage',
                        'layout': {
                            'text-field': ['get', 'name']
                        }
                    });

                    this.map.addSource('click', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: []
                        }
                    });

                    this.map.addLayer({
                        id: 'click',
                        type: 'symbol',
                        source: 'click',
                        layout: {
                            'icon-image': 'circle-15'
                        }
                    });
                });
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
