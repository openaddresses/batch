<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>

                <Status :status='job.status'/>

                <h2 class='txt-h4 ml12 fl mb6'>
                    Job #<span v-text='jobid'/>
                    <div class='cursor-pointer fr dropdown'>
                        <svg class='icon' style='margin-top: 5px;'><use xlink:href='#icon-chevron-down'/></svg>

                        <div class='round dropdown-content'>
                            <div @click='createRerun' class='round bg-gray-faint-on-hover'>Rerun</div>
                        </div>
                    </div>
                </h2>

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
            <div class='col col--12 py12'>
                <h3 class='fl txt-h4 py6'>
                    <span v-if='mode === "preview"'>Job Preview:</span>
                    <span v-if='mode === "numeric"'>Job Stats:</span>
                    <span v-if='mode === "bounds"'>Job Bounds:</span>
                </h3>

                <div class='flex-parent-inline fr'>
                    <button @click='mode = "preview"' :class='{ "btn--stroke": mode !== "preview" }' class='btn btn--s btn--pill btn--pill-hl round mx0'>Preview</button>
                    <button @click='mode = "numeric"' :class='{ "btn--stroke": mode !== "numeric" }' class='btn btn--s btn--pill btn--pill-hc round mx0'>Numeric</button>
                    <button @click='mode = "bounds"' :class='{ "btn--stroke": mode !== "bounds" }' class='btn btn--s btn--pill btn--pill-hr round mx0'>Map</button>
                </div>
            </div>

            <template v-if='mode === "preview"'>
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
            </template>
            <template v-else-if='mode === "numeric"'>
                <JobStats
                    @err='$emit("err", $event)'
                    :job='job'
                    :delta='delta'
                />
            </template>
            <template v-else-if='mode === "bounds"'>
                <JobMap
                    @err='$emit("err", $event)'
                    :job='job'
                    :delta='delta'
                />
            </template>
        </template>
    </div>
</template>

<script>

import Status from './Status.vue';
import JobStats from './job/JobStats.vue';
import JobMap from './job/JobMap.vue';

export default {
    name: 'Job',
    props: ['jobid', 'auth'],
    data: function() {
        return {
            mode: 'preview',
            loading: false,
            name: '',
            delta: {
                compare: false,
                master: false,
                delta: false
            },
            job: {
                output: {
                    cache: false,
                    output: false,
                    preview: false
                },
                count: 0,
                stats: {
                    counts: {}
                }
            }
        };
    },
    mounted: function() {
        this.refresh();
    },
    components: {
        JobMap,
        JobStats,
        Status
    },
    methods: {
        datapls: function() {
            if (!this.auth.username) return this.$emit('login');
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
            this.getDelta();
        },
        getDelta: function() {
            fetch(window.location.origin + `/api/job/${this.jobid}/delta`, {
                method: 'GET'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get job delta');
                }

                return res.json();
            }).then((res) => {
                this.delta.master = res.master;
                this.delta.compare = res.compare;
                this.delta.delta = res.delta;
            }).catch(() => {
                this.delta = false;
            });
        },
        getJob: function() {
            this.loading = true;
            fetch(window.location.origin + `/api/job/${this.jobid}`, {
                method: 'GET'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get job');
                }

                return res.json();
            }).then((res) => {
                this.job = res;

                this.name = this.job.source
                    .replace(/.*sources\//, '')
                    .replace(/\.json/, '');

                this.loading = false;
            }).catch((err) => {
                this.$emit('err', err);
            });
        },
        createRerun: function() {
            this.loading = true;
            fetch(window.location.origin + `/api/job/${this.jobid}/rerun`, {
                method: 'POST'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to rerun job');
                }

                return res.json();
            }).then((res) => {
                this.$router.push({ path: `/run/${res.run}` });
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>

<style>
    .dropdown {
        position: relative;
        display: inline-block;
    }

    .dropdown-content {
        display: none;
        position: absolute;
        background-color: #f9f9f9;
        box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
        padding: 6px 12px;
        z-index: 1;
    }

    .dropdown:hover .dropdown-content {
        display: block;
    }
</style>
