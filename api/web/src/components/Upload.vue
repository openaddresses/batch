<template>
    <div class='col col--12'>
        <div class='col col--12 py12'>
            <h2 class='txt-h4'>Source Upload:</h2>
        </div>

        <template v-if='auth && auth.flags && auth.access && (auth.flags.upload || auth.access === "admin")'>
            <UploadFile />
        </template>
        <template v-else-if='auth && auth.flags && auth.access'>
            <div class='flex flex--center-main'>
                <div class='py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>Account is missing upload permissions</div>
            <div @click='external("https://github.com/openaddresses/openaddresses")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Ask an admin to enable upload permissions on your account</div>
        </template>
        <template v-else>
            <div class='flex flex--center-main'>
                <div class='py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>You must be logged in to use the upload tool</div>
            <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Have a source? Add it via GitHub!</div>
        </template>
    </div>
</template>

<script>
import UploadFile from './upload/UploadFile.vue';

export default {
    name: 'Upload',
    props: ['auth'],
    data: function() {
        return {};
    },
    mounted: function() {
        this.$emit('auth');
    },
    components: {
        UploadFile
    },
    methods: {
        external: function(url) {
            window.open(url, "_blank");
        }
    }
}
</script>
