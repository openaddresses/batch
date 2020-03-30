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
            });
        }
    }
}
</script>
