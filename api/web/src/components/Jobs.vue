<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 pb12 fl'>Jobs:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>

            <div class='col col--1'>
                Status
            </div>
            <div class='col col--2'>
                Job ID
            </div>
            <div class='col col--4'>
                Source
            </div>
            <div class='col col--5'>
                <span class='fr'>Attributes</span>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div :key='job.id' v-for='job in jobs' class='col col--12 grid'>
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
                    <div class='col col--2'>
                        Job <span v-text='job.id'/>
                    </div>
                    <div class='col col--4'>
                        <span v-text='`${job.fullname} - ${job.layer} - ${job.name}`'/>
                    </div>
                    <div class='col col--5 pr12'>
                        <span @click='external(job.source)' v-if='job.source' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Source</span>
                        <span @click='emitlog(job.id)' v-if='job.loglink' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Logs</span>
                        <span @click='datapls(job)'  v-if='job.output.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Data</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Jobs',
    mounted: function() {
        window.location.hash = 'jobs';

        this.refresh();
    },
    data: function() {
        return {
            jobs: [],
            loading: false
        };
    },
    methods: {
        external: function(url) {
            window.open(url, "_blank");
        },
        emitlog: function(jobid) {
            this.$emit('log', jobid);
        },
        emitjob: function(jobid) {
            this.$emit('job', jobid);
        },
        refresh: function() {
            this.getJobs();
        },
        datapls: function(job) {
            this.external(`${window.location.origin}/api/job/${job.id}/output/source.geojson.gz`);
        },
        getJobs: function() {
            this.loading = true;
            fetch(window.location.origin + '/api/job', {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.jobs = res;
                this.loading = false;
            });
        }
    }
}
</script>
