<template>
<div>
    <div class='page-wrapper'>
        <div class="page-header d-print-none">
            <div class="container-xl">
                <div class="row g-2 align-items-center">
                    <div class="col d-flex">
                        <TablerBreadCrumb/>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class='page-body'>
        <div class='container-xl'>
            <div class='row row-deck row-cards'>
                <div class='col-12'>
                    <div class='card'>
                        <div class='card-header'>
                            <h3 class='card-title'>Source Upload</h3>
                        </div>
                        <div class='card-body'>
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
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import UploadFile from './upload/UploadFile.vue';
import {
    TablerBreadCrumb
} from '@tak-ps/vue-tabler';

export default {
    name: 'Upload',
    props: ['auth'],
    data: function() {
        return {};
    },
    mounted: function() {
        this.$emit('auth');
    },
    methods: {
        external: function(url) {
            window.open(url, "_blank");
        }
    },
    components: {
        TablerBreadCrumb,
        UploadFile
    },
}
</script>
