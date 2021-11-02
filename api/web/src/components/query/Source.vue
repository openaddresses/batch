<template>
    <div>
        <label>Source</label>
        <input v-model='source' class='input' placeholder='/ca/nb/provincewide' />
    </div>
</template>

<script>
export default {
    name: 'QuerySource',
    data: function() {
        return {
            source: ''
        };
    },
    watch: {
        source: function() {
            this.$emit('source', this.source);
        }
    }
}
</script>
