<template>
<div class='col-12'>
    <TablerEnum v-model='status' label='Status' :options='options'/>
</div>
</template>

<script>
import {
    TablerEnum
} from '@tak-ps/vue-tabler';

export default {
    name: 'QueryStatus',
    data: function() {
        return {
            status: 'All',
            options: [
                'All',
                'Pending',
                'Running',
                'Warn',
                'Success',
                'Fail'
            ]
        };
    },
    watch: {
        status: function() {
            this.$emit('status', this.status);
        }
    },
    components: {
        TablerEnum
    }
}
</script>
