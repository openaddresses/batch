<template>
<div class='col col--12'>
    <label>Layer</label>
    <div class='w-full select-container'>
        <select v-model='layer' class='select select--stroke'>
            <option>all</option>
            <option>addresses</option>
            <option>buildings</option>
            <option>parcels</option>
        </select>
        <div class='select-arrow'></div>
    </div>
</div>
</template>

<script>
export default {
    name: 'QueryLayer',
    data: function() {
        return {
            layer: 'all'
        };
    },
    watch: {
        layer: function() {
            this.$emit('layer', this.layer);
        }
    }
}
</script>
