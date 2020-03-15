<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
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

        <div :key='job.id' v-for='job in jobs' class='col col--12 grid'>
            <div @click='job.expand = !job.expand' class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
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
                    <span v-text='job.layer + "-" + job.name'/>
                </div>
                <div class='col col--5 pr12'>
                    <span @click='log(job.id)' v-if='job.loglink' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Logs</span>
                    <span v-if='job.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Data</span>
                </div>
            </div>
            <template v-if='job.expand'>
                <Job/>
            </template>
        </div>
    </div>
</template>

<script>
import Job from './Job.vue';

export default {
    name: 'Jobs',
    mounted: function() {
        window.location.hash = 'jobs';
        this.getJobs();
    },
    data: function() {
        return {
            jobs: []
        };
    },
    methods: {
        log: function(job_id) {
            this.$emit('log', job_id);
        },
        getJobs: function() {
            fetch(window.location.origin + '/api/job', {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.jobs = res.map((r) => {
                    r.expand = false;
                    return r;
                });
            });
        }
    },
    components: {
        Job
    }
}
</script>
