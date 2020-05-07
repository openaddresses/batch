<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>

                <h2 class='txt-h4 ml12 pb12 fl'>DATA HISTORY TITLE</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>

        <div class='col col--12 pt12'>
            <h2 class='txt-h4 pb12 fl'>Job History:</h2>
        </div>

        <div class='col col--1'>
            Status
        </div>
        <div class='col col--3'>
            Job ID
        </div>
        <div class='col col--5'>
            Updated
        </div>
        <div class='col col--3'>
            <span class='fr'>Attributes</span>
        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div :key='job.id' v-for='job in history.jobs' class='col col--12 grid'>
                <div @click='emitjob(job.id)' class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--1'>
                        <template v-if='job.status === "Pending"'>
                            <svg class='icon ml12 color-yellow opacity50' style='height: 16px; margin-top: 2px;'><use xlink:href='#icon-circle'/></svg>
                        </template>
                        <template v-else-if='job.status === "Success"'>
                            <svg class='icon ml12 color-green opacity50' style='height: 16px; margin-top: 2px;'><use xlink:href='#icon-circle'/></svg>
                        </template>
                        <template v-else-if='job.status === "Fail"'>
                            <svg class='icon ml12 color-red opacity50' style='height: 16px; margin-top: 2px;'><use xlink:href='#icon-circle'/></svg>
                        </template>
                    </div>
                    <div class='col col--3'>
                        Job <span v-text='job.id'/>
                    </div>
                    <div class='col col--5'>
                        <span v-text='job.created'></span>
                    </div>
                    <div class='col col--3'>
                        <span v-on:click.stop.prevent='datapls(job.id)' v-if='job.output.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Download</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'History',
    props: ['dataid'],
    data: function() {
        return {
            loading: false,
            history: {
                jobs: []
            }
        }
    },
    mounted: function() {
        this.refresh();
    },
    methods: {
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}`});
        },
        refresh: function() {
            this.getHistory();
        },
        datapls: function(id) {
            this.external(`${window.location.origin}/api/job/${id}/output/source.geojson.gz`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        getHistory: function() {
            this.loading = true;
            fetch(window.location.origin + `/api/data/${this.dataid}/history`, {
                method: 'GET'
            }).then((res) => {
                if (res.status !== 200 && res.message) {
                    throw new Error(res.message);
                } else if (res.status !== 200) {
                    throw new Error('Failed to get data history');
                }

                return res.json();
            }).then((res) => {
                this.history = res;
                this.loading = false;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
