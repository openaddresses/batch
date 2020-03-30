<template>
    <div class='col col--12'>
        <div id="map" class='w-full h300'></div>
    </div>
</template>

<script>
export default {
    name: 'Coverage',
    props: [],
    data: function() {
        return {
            map: ''
        }
    },
    mounted: function() {
        this.init();
    },
    methods: {
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
