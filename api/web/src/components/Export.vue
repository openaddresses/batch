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
                                            v-if='exp.status'
                                            :status='exp.status'
                                        />
                                        <LayerIcon
                                            class='align-self-center'
                                            :layer='job.layer'
                                        />
                                        <div class='mx-2 align-self-center'>
                                            Export #<span v-text='exportid' />
                                        </div>
                                    </div>
                                    <div
                                        style='padding-left: 50px;'
                                        class='subheader'
                                        v-text='`${job.source_name} - ${job.layer} - ${job.name}`'
                                    />
                                </div>

                                <div class='ms-auto btn-list'>
                                    <TablerDropdown>
                                        <slot>
                                            <IconDotsVertical
                                                class='cursor-pointer'
                                                size='32'
                                            />
                                        </slot>
                                        <template #dropdown>
                                            <div
                                                class='mx-2 my-2'
                                                @click='createRerun'
                                            >
                                                Rerun
                                            </div>
                                        </template>
                                    </TablerDropdown>

                                    <IconRefresh
                                        class='cursor-pointer'
                                        size='32'
                                        @click='refresh'
                                    />
                                </div>
                            </div>
                            <div class='card-body'>
                                <TablerLoading v-if='loading' />
                                <template v-else>
                                    <template v-if='!["Success", "Fail"].includes(exp.status)'>
                                        <TablerLoading
                                            v-if='exp.status === "Pending"'
                                            desc='Your Export Is Queued'
                                        />
                                        <TablerLoading
                                            v-else-if='exp.status === "Running"'
                                            desc='Your Export Is Running'
                                        />
                                    </template>
                                    <template v-else-if='exp.status === "Fail"'>
                                        <div class='col-12'>
                                            <h3 class='text-center txt-h4'>
                                                Your Export Failed - Contact us to find out what went wrong
                                            </h3>
                                        </div>
                                    </template>
                                    <template v-else-if='exp.status === "Success"'>
                                        <div class='d-flex justify-content-center mb-3'>
                                            <button
                                                class='btn btn-primary'
                                                @click='datapls'
                                            >
                                                <IconArrowDown size='32' /> Download&nbsp;
                                                <span v-text='exp.format' />
                                            </button>
                                        </div>
                                    </template>

                                    <div
                                        v-if='exp.status !== "Pending" && exp.loglink'
                                        class='col-12'
                                    >
                                        <Log
                                            :id='exp.id'
                                            collapse='true'
                                            logtype='export'
                                            @err='$emit("err", $event)'
                                        />
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
    IconArrowDown,
    IconRefresh,
    IconDotsVertical,
} from '@tabler/icons-vue';
import {
    TablerLoading,
    TablerDropdown,
    TablerBreadCrumb
} from '@tak-ps/vue-tabler';

export default {
    name: 'Export',
    components: {
        IconArrowDown,
        IconRefresh,
        IconDotsVertical,
        TablerLoading,
        TablerDropdown,
        TablerBreadCrumb,
        LayerIcon,
        Status,
        Log
    },
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
    unmounted: function() {
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
    }
}
</script>
