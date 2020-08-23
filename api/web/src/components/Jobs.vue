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
                        <Status :status='job.status'/>
                    </div>
                    <div class='col col--2'>
                        Job <span v-text='job.id'/>
                    </div>
                    <div class='col col--4'>
                        <span v-text='`${job.source_name} - ${job.layer} - ${job.name}`'/>
                    </div>
                    <div class='col col--5 pr12'>
                        <span v-on:click.stop.prevent='external(job.source)' v-if='job.source' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Source</span>
                        <span v-on:click.stop.prevent='emitlog(job.id)' v-if='job.loglink' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Logs</span>
                        <span v-on:click.stop.prevent='datapls(job)'  v-if='job.output.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Data</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import Status from './Status.vue';

export default {
    name: 'Jobs',
    props: [ 'auth' ],
    mounted: function() {
        this.refresh();
    },
    data: function() {
        return {
            jobs: [],
            loading: false
        };
    },
    components: {
        Status
    },
    methods: {
        external: function(url) {
            window.open(url, "_blank");
        },
        emitlog: function(jobid) {
            this.$router.push({ path: `/job/${jobid}/log` });
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` });
        },
        refresh: function() {
            this.getJobs();
        },
        datapls: function(job) {
            if (!this.auth.username) return this.$emit('login');
            this.external(`${window.location.origin}/api/job/${job.id}/output/source.geojson.gz`);
        },
        getJobs: function() {
            this.loading = true;
            fetch(window.location.origin + '/api/job', {
                method: 'GET'
            }).then((res) => {
                this.loading = false;
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get jobs');
                }

                return res.json();
            }).then((res) => {
                this.jobs = res;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
