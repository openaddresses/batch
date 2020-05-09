<template>
    <div class='col col--12'>
        <template v-if='auth && auth.flags && auth.access && (auth.flags.upload || auth.access === "admin")'>
            UPLOAD
        </template>
        <template v-else>
            NO UPLOAD
        </template>
    </div>
</template>

<script>
    export default {
        name: 'Upload',
        props: ['auth'],
        mounted: function() {
            console.error(JSON.stringify(this.auth, null, 4));
            this.$emit('auth');
        }
    }
</script>
