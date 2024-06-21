<template>
<div class='col-12'>
    <TablerNone v-if='!job.bounds' label='Job Bounds' :create='false'/>
    <template v-else>
        <div id='map' class='w-100' style='height: 300px;'></div>
    </template>
</div>
</template>

<script>
import mapgl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css';
import {
    TablerNone
} from '@tak-ps/vue-tabler';

let map;

export default {
    name: 'JobMap',
    props: ['job', 'delta'],
    mounted: function() {
        this.$nextTick(() => {
            this.init();
        });
    },
    methods: {
        init: async function() {
            try {
                if (!this.job.bounds) return;

                const res = await window.std('/api/map');

                const bounds = this.job.bounds.coordinates;
                const tmpmap = new mapgl.Map({
                    container: this.$refs.map,
                    hash: "map",
                    zoom: 1,
                    attributionControl: false,
                    bounds: [
                        bounds[0][0][0],
                        bounds[0][0][1],
                        bounds[0][2][0],
                        bounds[0][2][1]
                    ],
                    style: {
                        version: 8,
                        sources: {
                            basemap: {
                                type: 'raster',
                                tileSize: 256,
                                tiles: [
                                    `https://api.mapbox.com/styles/v1/ingalls/ckvh0wwm8g2cw15r05ozt0ybr/tiles/256/{z}/{x}/{y}@2x?access_token=${res.token}`
                                ]
                            }
                        },
                        layers: [{
                            id: 'background',
                            type: 'background',
                            paint: {
                                'background-color': 'rgb(4,7,14)'
                            }
                        },{
                            id: 'basemap',
                            type: 'raster',
                            source: 'basemap',
                            minzoom: 0,
                            maxzoom: 15
                        }]
                    }

                });

                tmpmap.addControl(new mapgl.AttributionControl({
                    customAttribution: '© <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a> | © <a href="https://www.openstreetmap.org/about/" target="_blank">OpenStreetMap</a> Contributors'
                }));
                tmpmap.addControl(new mapgl.NavigationControl(), 'bottom-right');

                tmpmap.once('load', () => {
                    map = tmpmap;

                    map.addSource('bounds', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: [{
                                type: 'Feature',
                                properties: {},
                                geometry: this.job.bounds
                            }]
                        }
                    });

                    map.addLayer({
                        id: 'bounds',
                        type: 'line',
                        source: 'bounds',
                        layout: { },
                        'paint': {
                            'line-color': '#ff0000',
                            'line-opacity': 0.8
                        }
                    });
                });
            } catch (err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        TablerNone
    }
}
</script>
