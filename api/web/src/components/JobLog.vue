<template>
    <div>
        <div class='page-wrapper'>
            <div class='page-header d-print-none'>
                <div class='container-xl'>
                    <div class='row g-2 align-items-center'>
                        <div class='col d-flex'>
                            <TablerBreadCrumb />
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
                                        <Status
                                            v-if='job.status'
                                            :status='job.status'
                                        />
                                        <div class='mx-2 align-self-center'>
                                            Job <span v-text='$route.params.jobid' />
                                        </div>
                                    </div>
                                    <div
                                        style='padding-left: 50px;'
                                        class='subheader'
                                        v-text='`${job.source_name} - ${job.layer} - ${job.name}`'
                                    />
                                </div>

                                <div class='ms-auto btn-list'>
                                    <IconRefresh
                                        class='cursor-pointer'
                                        size='32'
                                        stroke='1'
                                        @click='getJob'
                                    />
                                </div>
                            </div>
                            <TablerLoading v-if='loading' />
                            <TablerAlert
                                v-else-if='error'
                                :err='error'
                            />
                            <Log
                                v-else
                                :id='$route.params.jobid'
                                logtype='job'
                            />
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
    IconRefresh
} from '@tabler/icons-vue';
import {
    TablerBreadCrumb,
    TablerLoading,
    TablerAlert,
} from '@tak-ps/vue-tabler'

export default {
    name: 'JobLog',
    components: {
        IconRefresh,
        TablerAlert,
        TablerLoading,
        TablerBreadCrumb,
        Status,
        Log
    },
    data: function() {
        return {
            loading: true,
            error: undefined,
            job: {}
        }
    },
    mounted: async function() {
        await this.getJob();
    },
    methods: {
        getJob: async function() {
            try {
                this.error = undefined;
                this.loading = true;
                this.job = await window.std(`/api/job/${this.$route.params.jobid}`);
                this.loading = false;
            } catch(err) {
                error = err;
                this.loading = false;
            }
        },
    }
}
</script>
