<template>
    <div>
        <div class='page-wrapper'>
            <div class='page-header d-print-none'>
                <div class='container-xl'>
                    <div class='row g-2 align-items-center'>
                        <div class='col d-flex'>
                            <TablerBreadCrumb />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class='page-body'>
            <div class='container-xl'>
                <div class='row row-deck row-cards'>
                    <div
                        v-if='joberror'
                        class='card bg-danger-lt'
                        :class='{
                            "bg-danger-lt": job.status === "Fail",
                            "bg-warning-lt": job.status === "Warn"
                        }'
                    >
                        <div
                            v-if='job.status === "Fail"'
                            class='card-status-top bg-danger'
                        />
                        <div
                            v-if='job.status === "Warn"'
                            class='card-status-top bg-warning'
                        />
                        <div
                            v-if='job.status === "Fail"'
                            class='ribbon bg-red'
                        >
                            Error
                        </div>
                        <div
                            v-if='job.status === "Warn"'
                            class='ribbon bg-orange'
                        >
                            Warning
                        </div>
                        <div class='card-body'>
                            <h2
                                v-if='job.status === "Fail"'
                                class='text-center'
                            >
                                Active Job Error
                            </h2>
                            <h2
                                v-else
                                class='text-center'
                            >
                                Active Job Warning
                            </h2>

                            <div
                                v-for='message in joberror.messages'
                                :key='message'
                                class='text-center'
                                v-text='message'
                            />

                            <div class='d-flex justify-content-center pt-3'>
                                <ErrorsModerate
                                    class='py12'
                                    :error='job'
                                    @moderated='joberror = false'
                                />
                            </div>
                        </div>
                    </div>


                    <div class='col-12'>
                        <div class='card'>
                            <div class='card-header'>
                                <div class='card-title row'>
                                    <div class='d-flex'>
                                        <Status
                                            v-if='job.status'
                                            :status='job.status'
                                        />
                                        <LayerIcon
                                            class='align-self-center'
                                            :layer='job.layer'
                                        />
                                        <div class='mx-2 align-self-center'>
                                            Job <span v-text='$route.params.jobid' />
                                        </div>
                                    </div>
                                    <div
                                        style='padding-left: 50px;'
                                        class='subheader'
                                        v-text='`${job.source_name} - ${job.layer} - ${job.name}`'
                                    />
                                </div>

                                <div class='ms-auto btn-list'>
                                    <Download
                                        :auth='auth'
                                        :job='job'
                                        @login='$emit("login")'
                                        @perk='$emit("perk", $event)'
                                    />
                                    <IconLicense
                                        v-if='job.license'
                                        class='cursor-pointer'
                                        size='32'
                                        stroke='1'
                                    />
                                    <IconCode
                                        class='cursor-pointer'
                                        size='32'
                                        stroke='1'
                                        @click='$router.push({ path: `/job/${$route.params.jobid}/raw` })'
                                    />
                                    <IconNotes
                                        v-if='job.loglink'
                                        class='cursor-pointer'
                                        size='32'
                                        stroke='1'
                                        @click='$router.push({ path: `/job/${$route.params.jobid}/log` })'
                                    />
                                    <IconRefresh
                                        class='cursor-pointer'
                                        size='32'
                                        stroke='1'
                                        @click='refresh'
                                    />

                                    <div class='dropdown'>
                                        <div
                                            id='jobAdmin'
                                            type='button'
                                            data-bs-toggle='dropdown'
                                            aria-expanded='false'
                                        >
                                            <IconDotsVertical
                                                class='cursor-pointer'
                                                stroke='1'
                                                size='32'
                                            />
                                        </div>
                                        <ul
                                            class='dropdown-menu'
                                            aria-labelledby='jobAdmin'
                                        >
                                            <a
                                                class='dropdown-item cursor-pointer'
                                                @click='createRerun'
                                            >Create ReRun</a>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <TablerLoading
                                v-if='loading'
                                :desc='`Loading Job ${$route.params.jobid}`'
                            />
                            <template v-else-if='job.status === "Fail"'>
                                <Log
                                    :id='$route.params.jobid'
                                    logtype='job'
                                />
                            </template>
                            <template v-else>
                                <JobSample
                                    :job='job'
                                    @err='$emit("err", $event)'
                                />
                            </template>
                        </div>
                    </div>

                    <div
                        v-if='job.status !== "Fail"'
                        class='col-12'
                    >
                        <div class='card'>
                            <div class='card-header'>
                                <div class='card-title'>
                                    Job Statistics
                                </div>
                            </div>
                            <JobStats
                                :job='job'
                                :delta='delta'
                                @err='$emit("err", $event)'
                            />
                        </div>
                    </div>
                    <div
                        v-if='job.status !== "Fail"'
                        class='col-12'
                    >
                        <div class='card'>
                            <div class='card-header'>
                                <div class='card-title'>
                                    Job Map
                                </div>
                            </div>
                            <div class='card-body'>
                                <JobMap
                                    :job='job'
                                    :delta='delta'
                                    @err='$emit("err", $event)'
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Log from './util/Log.vue';
import LayerIcon from './util/LayerIcon.vue';
import {
    IconLicense,
    IconCode,
    IconNotes,
    IconRefresh,
    IconDotsVertical,
} from '@tabler/icons-vue'
import {
    TablerBreadCrumb,
    TablerLoading,
} from '@tak-ps/vue-tabler';
import ErrorsModerate from './util/ErrorsModerate.vue';
import Download from './util/Download.vue';
import Status from './util/Status.vue';
import JobSample from './job/JobSample.vue';
import JobStats from './job/JobStats.vue';
import JobMap from './job/JobMap.vue';

export default {
    name: 'Job',
    components: {
        Log,
        JobMap,
        JobSample,
        Download,
        JobStats,
        TablerBreadCrumb,
        TablerLoading,
        ErrorsModerate,
        Status,
        IconLicense,
        IconCode,
        IconNotes,
        IconRefresh,
        IconDotsVertical,
        LayerIcon
    },
    props: ['auth'],
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
    mounted: async function() {
        await this.refresh();
    },
    methods: {
        datapls: function() {
            if (!this.auth.username) return this.$emit('login');
            this.external(`${window.location.origin}/api/job/${this.$route.params.jobid}/output/source.geojson.gz?token=${localStorage.token}`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        refresh: async function() {
            await this.getJob();
            await this.getError();
            await this.getDelta();
        },
        getError: async function() {
            try {
                this.joberror = await window.std(`/api/job/error/${this.$route.params.jobid}`);
            } catch (err) {
                this.joberror = false;
            }
        },
        getDelta: async function() {
            try {
                const res = await window.std(window.location.origin + `/api/job/${this.$route.params.jobid}/delta`);
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
                this.job = await window.std(`/api/job/${this.$route.params.jobid}`);
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
                const res = await window.std(`/api/job/${this.$route.params.jobid}/rerun`, {
                    method: 'POST'
                });

                this.$router.push({ path: `/run/${res.run}` });
            } catch (err) {
                this.$emit('err', err);
            }

            this.loading = false;
        }
    },
}
</script>
