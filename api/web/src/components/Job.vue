<template>
    <div class='col col--12 grid pt12'>

        <div v-if='joberror' class='border mb24 round col col--12 py3' :class='{
            "border--red": job.status === "Fail",
            "bg-red-light": job.status === "Fail",
            "border--orange": job.status === "Warn",
            "bg-orange-light": job.status === "Warn"

        }'>
            <h2 v-if='job.status === "Fail"' class='txt-h4 align-center'>Active Job Error</h2>
            <h2 v-else class='txt-h4 align-center'>Active Job Warning</h2>

            <div :key='message' v-for='message in joberror.messages' class='align-center w-full' v-text='message'></div>

            <div class='flex-parent flex-parent--center-main'>
                <ErrorsModerate @moderated='joberror = false' class='py12' :job='job'/>
            </div>
        </div>

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

                <span v-on:click.stop.prevent='datapls' v-if='job.output.output' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-download" /></svg>
                </span>

                <span v-if='job.license' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-license" /></svg>
                </span>

                <span v-on:click.stop.prevent='external(job.source)' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-brand-github" /></svg>
                </span>

                <span v-on:click.stop.prevent='emitlog(job.id)' v-if='job.loglink' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-notes" /></svg>
                </span>
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

                    <h3 class='fl txt-h4 py6'>Job Sample:</h3>
                    <table class='table txt-xs mb60'>
                        <thead>
                            <tr>
                                <th :key='key' v-for='key of props' v-text='key'></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr :key='s.properties.hash' v-for='s of sample'>
                                <th :key='s.properties.hash + ":" + key' v-for='key of props' v-text='s.properties[key]'></th>
                            </tr>
                        </tbody>
                    </table>

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

import ErrorsModerate from './ErrorsModerate.vue';
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
            sample: [],
            props: [],
            name: '',
            joberror: false,
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
        ErrorsModerate,
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
            this.getError();
            this.getDelta();
            this.getSample();
        },
        getError: function() {
            fetch(window.location.origin + `/api/job/error/${this.jobid}`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                if (res.status === 404) return;
                this.joberror = res;
            }).catch(() => {
                this.joberror = false;
            });
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
        getSample: function() {
            fetch(window.location.origin + `/api/job/${this.jobid}/output/sample`, {
                method: 'GET'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get job sample');
                }

                return res.json();
            }).then((res) => {
                const props = {};
                for (const r of res) {
                    for (const key of Object.keys(r.properties)) {
                        props[key] = true;
                    }
                }

                this.props = Object.keys(props);
                this.sample = res;
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
