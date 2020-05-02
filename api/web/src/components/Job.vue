<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>

                <Status :status='job.status'/>

                <h2 class='txt-h4 ml12 pb12 fl'>Job #<span v-text='jobid'/></h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>

                <span v-on:click.stop.prevent='external(job.source)' v-if='job.source' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Source</span>
                <span v-on:click.stop.prevent='emitlog(job.id)' v-if='job.loglink' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Logs</span>
                <span v-on:click.stop.prevent='datapls' v-if='job.output.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Data</span>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6' v-text='`${job.source_name} - ${job.layer} - ${job.name}`'></h3>
            </div>

            <template v-if='job.output.preview'>
                <img class='round' :src='`/api/job/${job.id}/output/source.png`'/>
            </template>
            <template v-else>
                <div class='col col--12 border border--gray-light round'>
                    <div class='flex-parent flex-parent--center-main pt36'>
                        <svg class='flex-child icon w60 h60 color-gray'><use href='#icon-info'/></svg>
                    </div>

                    <div class='flex-parent flex-parent--center-main pt12 pb36'>
                        <h1 class='flex-child txt-h4 cursor-default'>No Preview Image Found</h1>
                    </div>
                </div>
            </template>

            <JobStats :job='job'/>
        </template>
    </div>
</template>

<script>

import Status from './Status.vue';
import JobStats from './JobStats.vue';

export default {
    name: 'Job',
    props: ['jobid'],
    data: function() {
        return {
            loading: false,
            name: '',
            job: {
                output: {
                    cache: false,
                    output: false,
                    preview: false
                },
                stats: {

                }
            }
        };
    },
    mounted: function() {
        this.refresh();
    },
    components: {
        JobStats,
        Status
    },
    methods: {
        datapls: function() {
            this.external(`${window.location.origin}/api/job/${this.job.id}/output/source.geojson.gz`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        emitlog: function(jobid) {
            this.$router.push({ path: `/job/${jobid}/log` });
        },
        refresh: function() {
            this.getJob();
        },
        getJob: function() {
            this.loading = true;
            fetch(window.location.origin + `/api/job/${this.jobid}`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.job = res;

                this.name = this.job.source
                    .replace(/.*sources\//, '')
                    .replace(/\.json/, '');

                this.loading = false;
            });
        }
    }
}
</script>
