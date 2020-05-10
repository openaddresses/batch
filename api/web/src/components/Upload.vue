<template>
    <div class='col col--12'>
        <div class='col col--12 py12'>
            <h2 class='txt-h4'>Source Upload:</h2>
        </div>

        <template v-if='auth && auth.flags && auth.access && (auth.flags.upload || auth.access === "admin")'>
            <UploadFile />
        </template>
        <template v-else>
            NO UPLOAD
        </template>
    </div>
</template>

<script>
    import UploadFile from './UploadFile.vue';

    export default {
        name: 'Upload',
        props: ['auth'],
        mounted: function() {
            console.error(JSON.stringify(this.auth, null, 4));
            this.$emit('auth');
        },
        components: {
            UploadFile
        }
    }
</script>
