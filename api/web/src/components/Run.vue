<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>

                <Status :status='run.status'/>

                <h2 class='txt-h4 ml12 pb12 fl'>Run #<span v-text='runid'/></h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>

                <span v-on:click.stop.prevent='github(run)' v-if='run.github.sha' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Github</span>

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
                            <Status :status='job.status'/>
                        </div>
                        <div class='col col--4'>
                            Job <span v-text='job.id'/>
                        </div>
                        <div class='col col--7'>
                            <span v-text='`${job.source_name} - ${job.layer} - ${job.name}`'></span>
                        </div>
                    </div>
                </div>
            </template>
        </template>
    </div>
</template>

<script>
import Status from './Status.vue';

export default {
    name: 'Run',
    props: ['runid'],
    data: function() {
        return {
            run: {
                status: '',
                github: {}
            },
            jobs: [],
            loading: {
                run: false,
                jobs: false
            }
        };
    },
    mounted: function() {
        this.refresh();
    },
    components: {
        Status
    },
    methods: {
        external: function(url) {
            window.open(url, "_blank");
        },
        refresh: function() {
            this.getRun();
            this.getJobs();
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` });
        },
        github: function(run) {
            this.external(`https://github.com/openaddresses/openaddresses/commit/${run.github.sha}`);
        },
        getRun: function() {
            this.loading.run = true;
            fetch(window.location.origin + `/api/run/${this.runid}`, {
                method: 'GET'
            }).then((res) => {
                this.loading.run = false;

                if (res.status !== 200 && res.message) {
                    throw new Error(res.message);
                } else if (res.status !== 200) {
                    throw new Error('Failed to register user');
                }

                return res.json();
            }).then((res) => {
                this.run = res;
            }).catch((err) => {
                this.$emit('err', err);
            })
        },
        getJobs: function() {
            this.loading.run = true;
            fetch(window.location.origin + `/api/job?run=${this.runid}`, {
                method: 'GET'
            }).then((res) => {
                this.loading.jobs = false;

                if (res.status !== 200 && res.message) {
                    throw new Error(res.message);
                } else if (res.status !== 200) {
                    throw new Error('Failed to register user');
                }

                return res.json();
            }).then((res) => {
                this.jobs = res;
            }).catch((err) => {
                this.$emit('err', err);
            })
        }
    }
}
</script>
