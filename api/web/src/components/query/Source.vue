<template>
    <div>
        <label>Source</label>

        <label v-if='showValidated' class='switch-container fr'>
            Validated Data
            <input type='checkbox' v-model='validated'/>
            <div class='ml6 switch switch--gray'></div>
        </label>

        <input v-model='source' class='input' placeholder='/ca/nb/provincewide' />
    </div>
</template>

<script>
export default {
    name: 'QuerySource',
    props: {
        showValidated: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        return {
            validated: false,
            source: ''
        };
    },
    watch: {
        source: function() {
            this.$emit('source', this.source);
        },
        validated: function() {
            this.$emit('validated', this.validated);
        }
    }
}
</script>
