<template>
    <div id='app' class='col col--12 h-full relative'>
        <div class='cursor-pointer absolute top left px3 py3 round z1 bg-white'>
             <svg class='inline pt3 icon'><use xlink:href='#icon-chevron-left'/></svg>
            <img @click='external("/")' class='h24 w24 round' src='../../../public/logo.jpg'/>
        </div>
        <Fabric/>
    </div>
</template>

<script>
import Fabric from '../../components/Fabric.vue';

export default {
    name: 'OpenAddressesFabric',
    mounted: function() {
    },
    data: function() {
        return {
        };
    },
    methods: {
        external: function(url, tab) {
            if (!tab) {
                window.location.href = url;
            } else {
                window.open(url, "_blank");
            }
        }
    },
    components: {
        Fabric
    }
}
</script>

