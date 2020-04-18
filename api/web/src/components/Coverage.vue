<template>
    <div class='col col--12' :class='{ absolute: fullscreen, right: fullscreen, left: fullscreen }'>
        <div class='col col--12 relative'>
            <div class='absolute top right z5'>
                <button @click='setFull' class='btn round btn--stroke fr color-gray bg-white my12 mx12'>
                    <svg v-if='!fullscreen' class='icon'><use href='#icon-fullscreen'/></svg>
                    <svg v-else class='icon'><use href='#icon-shrink'/></svg>
                </button>
            </div>

            <div id="map" class='w-full h300'></div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Coverage',
    props: [],
    data: function() {
        return {
            fullscreen: false,
            map: ''
        }
    },
    mounted: function() {
        this.init();
    },
    methods: {
        setFull: function() {
            this.fullscreen = !this.fullscreen;
            this.map.resize();
        },
        init: function() {
            fetch(`${window.location.origin}/api/map`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                mapboxgl.accessToken = res.token;

                this.map = new mapboxgl.Map({
                    container: 'map',
                    zoom: 1,
                    style: 'mapbox://styles/mapbox/light-v9'
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

                this.map.on('load', () => {
                    this.map.addSource('coverage', {
                        type: 'vector',
                        tiles: [
                            `${window.location.origin}/api/map/{z}/{x}/{y}.mvt`
                        ],
                        minzoom: 0,
                        maxzoom: 16
                    });

                    this.map.on('click', (e) => {
                        const point = [ e.lngLat.lng, e.lngLat.lat ]

                        this.$emit('point', point);
                    });

                    this.map.addLayer({
                        id: 'mapillary',
                        type: 'fill',
                        source: 'coverage',
                        'source-layer': 'data',
                        layout: { },
                        'paint': {
                            'fill-color': '#ff0000',
                            'fill-opacity': 0.8
                        }
                    });
                });
            });
        }
    }
}
</script>
