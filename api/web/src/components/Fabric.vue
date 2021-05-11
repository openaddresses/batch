<template>
    <div class='col col--12 h-full'>
        <div class='col col--12 relative h-full'>
            <div id='map' class='w-full h-full'></div>
        </div>
    </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default {
    name: 'Fabric',
    data: function() {
        return {
            map: ''
        }
    },
    mounted: function() {
        this.init();
    },
    methods: {
        init: async function() {
            try {
                const res = await window.std('/api/map');
                mapboxgl.accessToken = res.token;

                this.map = new mapboxgl.Map({
                    container: 'map',
                    style: 'mapbox://styles/mapbox/light-v9'
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

                this.map.on('load', () => {
                    this.map.addSource('borders', {
                        type: 'vector',
                        tiles: [
                            `${window.location.origin}/api/map/borders/{z}/{x}/{y}.mvt`
                        ],
                        minzoom: 0,
                        maxzoom: 5
                    });

                    this.map.on('click', (e) => {
                        console.error(this.map.queryRenderedFeatures(e.point))
                        this.point = [ e.lngLat.lng, e.lngLat.lat ]
                    });

                    const base = '#0b6623';

                    this.map.addLayer({
                        id: `borders`,
                        type: 'line',
                        source: 'borders',
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
                        'source': 'borders',
                        'layout': {
                            'text-field': ['get', 'name']
                        }
                    });

                    this.map.addLayer({
                        id: `coverage-poly`,
                        type: 'fill',
                        source: 'coverage',
                        'source-layer': 'data',
                        layout: { },
                        filter: ['==', ['geometry-type'], 'Polygon'],
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
                    }

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
                console.error(err);
                this.$emit('err', err);
            }
        }
    }
}
</script>
