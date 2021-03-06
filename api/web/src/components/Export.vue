<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>

                <Status :status='exp.status'/>

                <h2 class='txt-h4 ml12 fl mb6'>
                    Export #<span v-text='exportid'/>
                </h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex flex--center-main'>
                <h3 class='txt-h4 py6' v-text='`${job.source_name} - ${job.layer} - ${job.name}`'></h3>
            </div>

            <template v-if='!["Success", "Fail"].includes(exp.status)'>
                <div class='flex flex--center-main w-full py24'>
                    <div class='loading'></div>
                </div>
                <div class='col col--12 flex flex--center-main'>
                    <h3 v-if='exp.status === "Pending"' class='flex-child txt-h4 py6'>Your Export Is Queued</h3>
                    <h3 v-else-if='exp.status === "Running"' class='flex-child txt-h4 py6'>Your Export Is Running</h3>
                </div>
            </template>
            <template v-else-if='exp.status === "Fail"'>
                <div class='flex flex--center-main w-full'>
                </div>
                <div class='col col--12 flex flex--center-main'>
                    <h3 class='txt-h4 py6'>Your Export Failed - Contact us to find out what went wrong</h3>
                </div>
            </template>
            <template v-else-if='exp.status === "Success"'>
                <div class='flex flex--center-main w-full py12'>
                    <button @click='datapls' class='btn btn--stroke round btn--gray'>
                        <div class='flex flex--center-main'>
                            <svg class='icon h36 w36'><use xlink:href='#icon-arrow-down'/></svg>
                        </div>
                        <div class='align-center'>Download</div>
                        <div class='align-center' v-text='exp.format'></div>
                    </button>
                </div>
            </template>

            <div v-if='exp.status !== "Pending" && exp.loglink' class='col col--12 py12'>
                <Log @err='$emit("err", $event)' collapse='true' logtype='export' :id='exp.id'/>
            </div>
        </template>
    </div>
</template>

<script>

import Log from './Log.vue';
import Status from './Status.vue';

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
            this.external(`${window.location.origin}/api/export/${this.exp.id}/output/export.zip`);
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
        }
    },
    components: {
        Status,
        Log
    }
}
</script>
