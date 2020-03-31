<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <button @click='close' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>

                <template v-if='run.status === "Pending"'>
                    <svg class='fl icon ml12 color-yellow opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
                </template>
                <template v-else-if='run.status === "Success"'>
                    <svg class='fl icon ml12 color-green opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
                </template>
                <template v-else-if='run.status === "Fail"'>
                    <svg class='fl icon ml12 color-red opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
                </template>

                <h2 class='txt-h4 ml12 pb12 fl'>Run #<span v-text='runid'/></h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>

        <template v-if='loading.run'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 pt12'>
                <h2 class='txt-h4 pb12 fl'>Jobs:</h2>
            </div>

            <div class='col col--1'>
                Status
            </div>
            <div class='col col--4'>
                Job ID
            </div>
            <div class='col col--7'>
                Source
            </div>

            <template v-if='loading.jobs'>
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
                        <div class='col col--4'>
                            Job <span v-text='job.id'/>
                        </div>
                        <div class='col col--7'>
                            <span v-text='job.layer + "-" + job.name'/>
                        </div>
                    </div>
                </div>
            </template>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Run',
    props: ['runid'],
    data: function() {
        return {
            run: {
                status: ''
            },
            jobs: [],
            loading: {
                run: false,
                jobs: false
            }
        };
    },
    mounted: function() {
        window.location.hash = `runs:${this.runid}`
        this.refresh();
    },
    methods: {
        close: function() {
            this.$emit('close');
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        refresh: function() {
            this.getRun();
            this.getJobs();
        },
        emitjob: function(jobid) {
            this.$emit('job', jobid);
        },
        getRun: function() {
            this.loading.run = true;
            fetch(window.location.origin + `/api/run/${this.runid}`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.run = res;
                this.loading.run = false;
            });
        },
        getJobs: function() {
            this.loading.run = true;
            fetch(window.location.origin + `/api/job?run=${this.runid}`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.jobs = res;

                /*
                this.name = this.job.source
                    .replace(/.*sources\//, '')
                    .replace(/\.json/, '');
                */

                this.loading.jobs = false;
            });
        }
    }
}
</script>