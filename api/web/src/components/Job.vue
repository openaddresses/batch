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

            <div class='flex flex--center-main'>
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

                <Download :auth='auth' :job='job' @login='$emit("login")' @perk='$emit("perk", $event)'/>

                <span v-if='job.license' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-license" /></svg>
                </span>

                <span v-on:click.stop.prevent='$router.push({ path: `/job/${jobid}/raw` })' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-code" /></svg>
                </span>

                <span v-on:click.stop.prevent='$router.push({ path: `/job/${jobid}/log` })' v-if='job.loglink' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-notes" /></svg>
                </span>
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
</template>

<script>

import ErrorsModerate from './ErrorsModerate.vue';
import Download from './Download.vue';
import Status from './Status.vue';
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
    components: {
        JobMap,
        JobSample,
        Download,
        JobStats,
        ErrorsModerate,
        Status
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
        }
    }
}
</script>
