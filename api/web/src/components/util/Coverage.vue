<template>
<div :style='{
        "height": (!fullscreen ? 300 : 600) + "px"
    }'>
    <div class='row'>
        <div class='col-12' :class='{
            "absolute right left": fullscreen,
        }'>
            <div class='absolute top right z1'>
            </div>

            <div v-if='point' class='absolute top left z1'>
                <button @click='point = false' class='btn round btn--stroke fr color-gray bg-white my12 mx12 px6 py0'>
                    <span><svg class='icon fl h24'><use href='#icon-close'/></svg> Clear Filter</span>
                </button>
            </div>

            <div ref='map' class='w-100' :style='{
                "height": (!fullscreen ? 300 : 600) + "px"
            }'></div>
        </div>
    </div>
</div>
</template>

<script>
import mapgl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css';
let map = null;

export default {
    name: 'Coverage',
    props: {
        layer: {
            type: String
        },
        filter: {
            type: String
        },
        bbox: {
            type: Array
        },
        features: {
            type: Object,
            default: {
                type: 'FeatureCollection',
                features: []
            }
        },
    },
    data: function() {
        return {
            layers: ['addresses', 'parcels', 'buildings'],
            fullscreen: false,
            point: false,
        }
    },
    watch: {
        layer: function() {
            for (const layer of this.layers) {
                map.setLayoutProperty(`coverage-${layer}-poly`, 'visibility', 'none');
                map.setLayoutProperty(`coverage-${layer}-point`, 'visibility', 'none');
            }

            if (this.layer !== 'all') {
                map.setLayoutProperty('coverage-poly', 'visibility', 'none');
                map.setLayoutProperty('coverage-point', 'visibility', 'none');

                map.setLayoutProperty(`coverage-${this.layer}-poly`, 'visibility', 'visible');
                map.setLayoutProperty(`coverage-${this.layer}-point`, 'visibility', 'visible');
            } else {
                map.setLayoutProperty('coverage-poly', 'visibility', 'visible');
                map.setLayoutProperty('coverage-point', 'visibility', 'visible');
            }

        },
        point: function() {
            if (!this.point) {
                map.getSource('click').setData({
                    type: 'FeatureCollection',
                    features: []
                });
            } else {
                map.getSource('click').setData({
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
    mounted: async function() {
        this.$nextTick(async () => {
            await this.init();
        });
    },
    methods: {
        setFull: function() {
            this.fullscreen = !this.fullscreen;
            this.$nextTick(() => {
                map.resize();
            });
        },
        init: async function() {
            try {
                const res = await window.std('/api/map');

                const opts = {
                    container: this.$refs.map,
                    hash: "map",
                    style: 'https://api.protomaps.com/styles/v4/grayscale/en.json?key=' + res.protomaps_key,

                }

                opts.center = [0, 0];
                opts.zoom = 0;

                const tmpmap = new mapgl.Map(opts);
                tmpmap.addControl(new mapgl.NavigationControl(), 'bottom-right');
                tmpmap.once('idle', () => {
                    map = tmpmap;
                    if (this.bbox) map.fitBounds(this.bbox);

                    map.addSource('features', {
                        type: 'geojson',
                        data: JSON.parse(JSON.stringify(this.features))
                    });

                    map.on('click', (e) => {
                        this.point = [ e.lngLat.lng, e.lngLat.lat ]
                    });

                    const base = '#0b6623';

                    map.addLayer({
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

                    map.addLayer({
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
                            map.setFilter(layer, [
                                '==',
                                ['id'],
                                parseInt(this.filter)
                            ]);
                        }
                    }

                    for (const layer of ['addresses', 'parcels', 'buildings']) {
                        map.addLayer({
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

                        map.addLayer({
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
                            map.setFilter(`coverage-${layer}-poly`, [
                                '==',
                                ['id'],
                                parseInt(this.filter)
                            ]);

                            map.setFilter(`coverage-${layer}-point`, [
                                '==',
                                ['id'],
                                parseInt(this.filter)
                            ]);
                        }
                    }

                    map.addLayer({
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

                    map.addSource('click', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: []
                        }
                    });

                    map.addLayer({
                        id: `features-poly`,
                        type: 'fill',
                        source: 'features',
                        filter: ['==', '$type', 'Polygon'],
                        layout: { },
                        paint: {
                            'fill-color': base,
                            'fill-opacity': 0.5
                        }
                    });

                    map.addLayer({
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
