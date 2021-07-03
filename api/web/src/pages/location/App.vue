<template>
    <div id='app' class='col col--12 h-full relative'>
        I'M A LOCATION PAGE
    </div>
</template>

<script>
export default {
    name: 'OpenAddressesLocation',
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
    }
}
</script>

