<template>
    <div class='col col--12'>
        <template v-if='!job.bounds'>
            <div class='col col--12 border border--gray-light round'>
                <div class='flex-parent flex-parent--center-main pt36'>
                    <svg class='flex-child icon w60 h60 color-gray'><use href='#icon-info'/></svg>
                </div>

                <div class='flex-parent flex-parent--center-main pt12 pb36'>
                    <h1 class='flex-child txt-h4 cursor-default'>Job does not have bounds</h1>
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
    props: ['job'],
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
        init: function() {
            if (!this.job.bounds) return;

            fetch(`${window.location.origin}/api/map`, {
                method: 'GET'
            }).then((res) => {
                if (res.status !== 200 && res.message) {
                    throw new Error(res.message);
                } else if (res.status !== 200) {
                    throw new Error('Failed to fetch map data');
                }

                return res.json();
            }).then((res) => {
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
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
