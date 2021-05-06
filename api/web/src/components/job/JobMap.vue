<template>
    <div class='col col--12'>
        <template v-if='!job.bounds'>
            <div class='col col--12 border border--gray-light round'>
                <div class='flex flex--center-main pt36'>
                    <svg class='icon w60 h60 color-gray'><use href='#icon-info'/></svg>
                </div>

                <div class='flex flex--center-main pt12 pb36'>
                    <h1 class='txt-h4 cursor-default'>Job does not have bounds</h1>
                </div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12'>
                <div id='map' class='w-full h300'></div>
            </div>
        </template>
    </div>
</template>

<script>
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default {
    name: 'JobMap',
    props: ['job', 'delta'],
    data: function() {
        return {
            map: false
        }
    },
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
                mapboxgl.accessToken = res.token;

                const bounds = this.job.bounds.coordinates;
                this.map = new mapboxgl.Map({
                    container: 'map',
                    zoom: 1,
                    style: 'mapbox://styles/mapbox/light-v9',
                    bounds: [
                        bounds[0][0][0],
                        bounds[0][0][1],
                        bounds[0][2][0],
                        bounds[0][2][1]
                    ]
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

                this.map.on('load', () => {
                    this.map.addSource('bounds', {
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

                    this.map.addLayer({
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
    }
}
</script>
