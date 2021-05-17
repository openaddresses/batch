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
                    center: [-108.55118480513727, 39.073072429359],
                    zoom: 10,
                    style: 'mapbox://styles/mapbox/light-v9'
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

                this.map.on('load', () => {
                    this.map.addSource('fabric', {
                        type: 'vector',
                        minzoom: 8,
                        maxzoom: 15,
                        tiles: [
                            `${window.location.origin}/api/map/fabric/{z}/{x}/{y}.mvt`
                        ]
                    });

                    this.map.addLayer({
                        id: `parcels`,
                        type: 'line',
                        source: 'fabric',
                        'source-layer': 'parcels',
                        layout: { },
                        filter: ['==', ['geometry-type'], 'Polygon'],
                        paint: {
                            'line-color': 'rgba(0, 0, 0, 0.1)',
                            'line-width': 1
                        }
                    });

                    this.map.on('click', (e) => {
                        console.error(this.map.queryRenderedFeatures(e.point))
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
