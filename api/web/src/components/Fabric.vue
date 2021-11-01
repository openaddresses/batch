<template>
    <div class='col col--12 h-full'>
        <div class='col col--12 relative h-full'>
            <div id='map' class='w-full h-full'></div>

            <div class='absolute top right pt3'>
                <button @click='filter.layers.buildings = !filter.layers.buildings' class='btn btn--stroke btn--s mx3 round color-gray' :class='{
                    "color-gray": !filter.layers.buildings,
                    "color-blue": filter.layers.buildings
                }'>
                    <svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-building-community" /></svg>
                </button>
                <button @click='filter.layers.addresses = !filter.layers.addresses' class='btn btn--stroke btn--s mx3 round' :class='{
                    "color-gray": !filter.layers.addresses,
                    "color-blue": filter.layers.addresses
                }'>
                    <svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-map-pin" /></svg>
                </button>
                <button @click='filter.layers.parcels = !filter.layers.parcels' class='btn btn--stroke btn--s mx3 round' :class='{
                    "color-gray": !filter.layers.parcels,
                    "color-blue": filter.layers.parcels
                }'>
                    <svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-shape" /></svg>
                </button>
            </div>

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
            tilejson: {},
            filter: {
                layers: {
                    addresses: true,
                    parcels: true,
                    buildings: true
                }
            },
            map: ''
        }
    },
    mounted: async function() {
        await this.getTilejson();
        this.init();
    },
    methods: {
        getTilejson: async function() {
            try {
                this.tilejson = await window.std('/api/map/fabric');
            } catch (err) {
                this.$emit('err', err);
            }
        },
        init: async function() {
            try {
                const res = await window.std('/api/map');
                mapboxgl.accessToken = res.token;

                this.map = new mapboxgl.Map({
                    container: 'map',
                    center: this.tilejson.center,
                    zoom: this.tilejson.minzoom,
                    style: 'mapbox://styles/ingalls/ckvh0wwm8g2cw15r05ozt0ybr'
                });

                this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

                this.map.on('load', () => {
                    this.map.addSource('fabric', {
                        type: 'vector',
                        minzoom: this.tilejson.minzoom,
                        maxzoom: this.tilejson.maxzoom,
                        tiles: [
                            `${window.location.origin}/api/map/fabric/{z}/{x}/{y}.mvt`
                        ]
                    });

                    this.map.addLayer({
                        id: `addresses`,
                        type: 'circle',
                        source: 'fabric',
                        'source-layer': 'addresses',
                        layout: { },
                        filter: ['==', ['geometry-type'], 'Point'],
                        paint: {
                            'circle-radius': 4,
                            'circle-color': 'rgba(0, 0, 0, 0.1)'
                        }
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

                    this.map.addLayer({
                        id: `buildings`,
                        type: 'line',
                        source: 'fabric',
                        'source-layer': 'buildings',
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
