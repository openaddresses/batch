<template>
    <div class='col-12'>
        <TablerEnum
            v-model='layer'
            label='Layer'
            :options='options'
        />
    </div>
</template>

<script>
import {
    TablerEnum
} from '@tak-ps/vue-tabler';

export default {
    name: 'QueryLayer',
    components: {
        TablerEnum
    },
    data: function() {
        return {
            layer: 'all',
            options: [
                'all',
                'addresses',
                'buildings',
                'parcels'
            ]
        };
    },
    watch: {
        layer: function() {
            this.$emit('layer', this.layer);
        }
    }
}
</script>
