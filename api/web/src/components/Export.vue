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
                                    <Status v-if='exp.status' :status='exp.status'/>
                                    <LayerIcon class='align-self-center' :layer='job.layer'/>
                                    <div class='mx-2 align-self-center'>
                                        Export #<span v-text='exportid'/>
                                    </div>
                                </div>
                                <div style='padding-left: 50px;' class='subheader' v-text='`${job.source_name} - ${job.layer} - ${job.name}`'></div>
                            </div>

                            <div class='ms-auto btn-list'>
                                <TablerDropdown>
                                    <slot>
                                        <DotsVerticalIcon class='cursor-pointer'/>
                                    </slot>
                                    <template #dropdown>
                                        <div @click='createRerun' class='mx-2 my-2'>Rerun</div>
                                    </template>
                                </TablerDropdown>

                                <RefreshIcon @click='refresh' class='cursor-pointer'/>
                            </div>
                        </div>
                        <div class='card-body'>
                            <TablerLoading v-if='loading'/>
                            <template v-else>
                                <template v-if='!["Success", "Fail"].includes(exp.status)'>
                                    <TablerLoading v-if='exp.status === "Pending"' desc='Your Export Is Queued'/>
                                    <TablerLoading v-else-if='exp.status === "Running"' desc='Your Export Is Running'/>
                                </template>
                                <template v-else-if='exp.status === "Fail"'>
                                    <div class='col-12'>
                                        <h3 class='text-center txt-h4'>Your Export Failed - Contact us to find out what went wrong</h3>
                                    </div>
                                </template>
                                <template v-else-if='exp.status === "Success"'>
                                    <div class='d-flex justify-content-center mb-3'>
                                        <button @click='datapls' class='btn btn-primary'>
                                            <ArrowDownIcon/> Download&nbsp;
                                            <span v-text='exp.format'/>
                                        </button>
                                    </div>
                                </template>

                                <div v-if='exp.status !== "Pending" && exp.loglink' class='col-12'>
                                    <Log @err='$emit("err", $event)' collapse='true' logtype='export' :id='exp.id'/>
                                </div>
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

import Log from './util/Log.vue';
import Status from './util/Status.vue';
import LayerIcon from './util/LayerIcon.vue';
import {
    ArrowDownIcon,
    RefreshIcon,
    DotsVerticalIcon,
} from 'vue-tabler-icons';
import {
    TablerLoading,
    TablerDropdown,
    TablerBreadCrumb
} from '@tak-ps/vue-tabler';

export default {
    name: 'Export',
    props: ['exportid', 'auth'],
    data: function() {
        return {
            loading: true,
            interval: false,
            exp: {
                status: 'Pending',
            },
            job: false
        }
    },
    mounted: function() {
        this.refresh();

        this.interval = setInterval(() => {
            this.getExport(false);
        }, 3000);
    },
    destroyed: function() {
        clearInterval(this.interval);
    },
    methods: {
        datapls: function() {
            this.external(`${window.location.origin}/api/export/${this.exp.id}/output/export.zip?token=${localStorage.token}`);
        },
        refresh: function() {
            this.getExport(true);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        getExport: async function(loading) {
            try {
                if (loading) this.loading = true;
                this.exp = await window.std(`/api/export/${this.exportid}`);

                if (!this.job) {
                    this.getJob();
                } else {
                    this.loading = false;
                }
            } catch(err) {
                this.$emit('err', err);
            }
        },
        getJob: async function() {
            try {
                this.job = await window.std(window.location.origin + `/api/job/${this.exp.job_id}`);
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
        createRerun: async function() {
            try {
                this.loading = true;
                await window.std(`/api/export/${this.exportid}`, {
                    method: 'PUT'
                });

                this.refresh();
            } catch (err) {
                this.$emit('err', err);
            }

            this.loading = false;
        }
    },
    components: {
        ArrowDownIcon,
        RefreshIcon,
        DotsVerticalIcon,
        TablerLoading,
        TablerDropdown,
        TablerBreadCrumb,
        LayerIcon,
        Status,
        Log
    }
}
</script>
