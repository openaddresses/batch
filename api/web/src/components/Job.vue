<template>
<div>
    <div class='page-wrapper'>
        <div class="page-header d-print-none">
            <div class="container-xl">
                <div class="row g-2 align-items-center">
                    <div class="col d-flex">
                        <TablerBreadCrumb/>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class='page-body'>
        <div class='container-xl'>
            <div class='row row-deck row-cards'>
                <div class="card">
                    <div v-if='job.status === "Fail"' class="card-status-top bg-danger"></div>
                    <div v-if='job.status === "Warn"' class="card-status-top bg-warning"></div>
                    <div v-if='job.status === "Fail"' class="ribbon bg-red">Error</div>
                    <div v-if='job.status === "Warn"' class="ribbon bg-orange">Warning</div>
                    <div class="card-body">
                        <h2 v-if='job.status === "Fail"' class='text-center'>Active Job Error</h2>
                        <h2 v-else class='text-center'>Active Job Warning</h2>

                        <div :key='message' v-for='message in joberror.messages' class='text-center' v-text='message'></div>

                        <div class='d-flex justify-content-center pt-3'>
                            <ErrorsModerate @moderated='joberror = false' class='py12' :error='job'/>
                        </div>
                    </div>
                </div>


                <div class='col-12'>
                    <div class='card'>
                        <div class='card-header'>
                            <h3 class='card-title d-flex'>
                                <Status v-if='job.status' :status='job.status'/>
                                <div class='mx-2 align-self-center'>
                                    Job <span v-text='$route.params.jobid'/>
                                </div>
                            </h3>

                            <div class='ms-auto btn-list'>
                                <Download :auth='auth' :job='job' @login='$emit("login")' @perk='$emit("perk", $event)'/>
                                <LicenseIcon v-if='job.license' class='cursor-pointer'/>
                                <CodeIcon @click='$router.push({ path: `/job/${jobid}/raw` })' class='cursor-pointer'/>
                                <NotesIcon @click='$router.push({ path: `/job/${jobid}/log` })' v-if='job.loglink' class='cursor-pointer'/>
                                <RefreshIcon @click='refresh' class='cursor-pointer'/>
                            </div>
                        </div>

                        <TablerLoading v-if='loading' :desc='`Loading Job ${$route.params.jobid}`'/>
                        <div v-else class='card-body'>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!--
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
            <div class='col col--12 py12'>
                <h3 class='fl txt-h4 py6'>
                    <span v-if='mode === "preview"'>Job Preview:</span>
                    <span v-if='mode === "numeric"'>Job Stats:</span>
                    <span v-if='mode === "bounds"'>Job Bounds:</span>
                </h3>

                <div class='flex-inline fr'>
                    <button @click='mode = "preview"' :class='{ "btn--stroke": mode !== "preview" }' class='btn btn--s btn--pill btn--pill-hl round mx0'>Preview</button>
                    <button @click='mode = "numeric"' :class='{ "btn--stroke": mode !== "numeric" }' class='btn btn--s btn--pill btn--pill-hc round mx0'>Numeric</button>
                    <button @click='mode = "bounds"' :class='{ "btn--stroke": mode !== "bounds" }' class='btn btn--s btn--pill btn--pill-hr round mx0'>Map</button>
                </div>
            </div>

            <template v-if='mode === "preview"'>
                <JobSample
                    @err='$emit("err", $event)'
                    :job='job'
                />
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
-->
</template>

<script>
import {
    LicenseIcon,
    CodeIcon,
    NotesIcon,
    RefreshIcon,
} from 'vue-tabler-icons'
import {
    TablerBreadCrumb,
    TablerLoading,
} from '@tak-ps/vue-tabler';
import ErrorsModerate from './ErrorsModerate.vue';
import Download from './Download.vue';
import Status from './util/Status.vue';
import JobSample from './job/JobSample.vue';
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
    methods: {
        datapls: function() {
            if (!this.auth.username) return this.$emit('login');
            this.external(`${window.location.origin}/api/job/${this.job.id}/output/source.geojson.gz?token=${localStorage.token}`);
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
        },
        getError: async function() {
            try {
                this.joberror = await window.std(`/api/job/error/${this.jobid}`);
            } catch (err) {
                this.joberror = false;
            }
        },
        getDelta: async function() {
            try {
                const res = await window.std(window.location.origin + `/api/job/${this.jobid}/delta`);
                this.delta.master = res.master;
                this.delta.compare = res.compare;
                this.delta.delta = res.delta;
            } catch (err) {
                this.delta = false;
            }
        },
        getJob: async function() {
            try {
                this.loading = true;
                this.job = await window.std(`/api/job/${this.jobid}`);
                this.name = this.job.source
                    .replace(/.*sources\//, '')
                    .replace(/\.json/, '');

                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
        createRerun: async function() {
            try {
                this.loading = true;
                const res = await window.std(`/api/job/${this.jobid}/rerun`, {
                    method: 'POST'
                });

                this.$router.push({ path: `/run/${res.run}` });
            } catch (err) {
                this.$emit('err', err);
            }

            this.loading = false;
        }
    },
    components: {
        JobMap,
        JobSample,
        Download,
        JobStats,
        TablerBreadCrumb,
        TablerLoading,
        ErrorsModerate,
        Status,
        LicenseIcon,
        CodeIcon,
        NotesIcon,
        RefreshIcon,
    },
}
</script>
