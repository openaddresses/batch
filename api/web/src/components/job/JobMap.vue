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
                    bounds: [
                        bounds[0][0][0],
                        bounds[0][0][1],
                        bounds[0][2][0],
                        bounds[0][2][1]
                    ],
                    style: 'https://api.protomaps.com/styles/v4/grayscale/en.json?key=' + res.protomaps_key,
                });

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
