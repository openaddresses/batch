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
                            <div class='card-title row'>
                                <div class='d-flex'>
                                    <Status v-if='job.status' :status='job.status'/>
                                    <div class='mx-2 align-self-center'>
                                        Job <span v-text='$route.params.jobid'/>
                                    </div>
                                </div>
                                <div style='padding-left: 50px;' class='subheader' v-text='`${job.source_name} - ${job.layer} - ${job.name}`'></div>
                            </div>

                            <div class='ms-auto btn-list'>
                                <RefreshIcon @click='getJob' class='cursor-pointer'/>
                            </div>
                        </div>
                        <TablerLoading v-if='loading'/>
                        <Log v-else @err='$emit("err", $event)' logtype='job' :id='$route.params.jobid'/>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import Log from './util/Log.vue'
import Status from './util/Status.vue'
import {
    RefreshIcon
} from 'vue-tabler-icons';
import {
    TablerBreadCrumb,
    TablerLoading
} from '@tak-ps/vue-tabler'

export default {
    name: 'JobLog',
    data: function() {
        return {
            loading: true,
            job: {}
        }
    },
    mounted: async function() {
        await this.getJob();
    },
    methods: {
        getJob: async function() {
            try {
                this.loading = true;
                this.job = await window.std(`/api/job/${this.jobid}`);
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
    },
    components: {
        RefreshIcon,
        TablerLoading,
        TablerBreadCrumb,
        Log
    }
}
</script>
