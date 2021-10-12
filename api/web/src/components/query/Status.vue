<template>
<div class='col col--12'>
    <label>Status</label>
    <div class='w-full select-container'>
        <select v-model='status' class='select select--stroke'>
            <option>All</option>
            <option>Pending</option>
            <option>Running</option>
            <option>Warn</option>
            <option>Success</option>
            <option>Fail</option>
        </select>
        <div class='select-arrow'></div>
    </div>
</div>
</template>

<script>
export default {
    name: 'QueryStatus',
    data: function() {
        return {
            status: 'All'
        };
    },
    watch: {
        status: function() {
            this.$emit('status', this.status);
        }
    }
}
</script>
