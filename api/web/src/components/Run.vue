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
                <div class='col-12'>
                    <div class='card'>
                        <div class='card-header'>
                            <h3 class='card-title'>
                                <Status v-if='run && run.status' :status='run.status'/>
                                Run <span v-text='$route.params.runid'/>
                            </h3>

                            <div class='ms-auto btn-list'>
                                <span v-if='run.live' class="badge bg-green text-white">Live</span>
                                <span v-if='run.github.sha' v-on:click.stop.prevent='github(run)' class="badge bg-blue text-white">Github</span>
                                <RefreshIcon @click='fetchRun' class='cursor-pointer'/>
                            </div>
                        </div>

                        <TablerLoading v-if='loading.run' :desc='`Loading Run ${$route.params.runid}`'/>
                        <div v-else class='card-body'>
                            <div class='border round row py-3'>
                                <div @click='filterShortcut("Pending")' class='col-3'>
                                    <div class='text-center' v-text='count.status.Pending + " Jobs"'></div>
                                    <div class='d-flex justify-content-center my-2'>
                                        <Status status='Pending'/>
                                    </div>
                                    <div class='text-center'>Pending</div>
                                </div>
                                <div @click='filterShortcut("Warn")' class='col-3'>
                                    <div class='text-center' v-text='count.status.Warn + " Jobs"'></div>
                                    <div class='d-flex justify-content-center my-2'>
                                        <Status status='Warn'/>
                                    </div>
                                    <div class='text-center'>Warn</div>
                                </div>
                                <div @click='filterShortcut("Fail")' class='col-3'>
                                    <div class='text-center' v-text='count.status.Fail + " Jobs"'></div>
                                    <div class='d-flex justify-content-center my-2'>
                                            <Status status='Fail'/>
                                    </div>
                                    <div class='text-center'>Fail</div>
                                </div>
                                <div @click='filterShortcut("Success")' class='col-3'>
                                    <div class='text-center' v-text='count.status.Success + " Jobs"'></div>
                                    <div class='d-flex justify-content-center my-2'>
                                        <Status status='Success'/>
                                    </div>
                                    <div class='text-center'>Success</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!--

                <template v-if='showFilter'>
                    <div class='col col--12 grid border border--gray px6 py6 round mb12 relative'>
                        <div class='absolute triangle--u triangle color-gray' style='top: -12px; right: 75px;'></div>

                        <div class='col col--3 px6'>
                            <label>Status</label>
                            <select v-model='filter.status' class='select'>
                                <option>All</option>
                                <option>Pending</option>
                                <option>Running</option>
                                <option>Success</option>
                                <option>Warn</option>
                                <option>Fail</option>
                            </select>
                            <div class='select-arrow'></div>
                        </div>
                        <div class='col col--6 px6'>
                            <label>Source</label>
                            <input v-model='filter.source' class='input' placeholder='/ca/nb/provincewide' />
                        </div>
                        <div class='col col--3 px6'>
                            <label>Layer</label>
                            <div class='w-full select-container'>
                                <select v-model='filter.layer' class='select'>
                                    <option>all</option>
                                    <option>addresses</option>
                                    <option>buildings</option>
                                    <option>parcels</option>
                                </select>
                                <div class='select-arrow'></div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>


            <div class='col col--12 pt12'>
                <h2 class='txt-h4 pb12 fl'>Jobs:</h2>
            </div>

            <template v-if='loading.jobs'>
                <div class='flex flex--center-main w-full py24'>
                    <div class='loading'></div>
                </div>
            </template>
            <template v-else-if='jobs.length'>
                <div class='col col--1'>
                    Status
                </div>
                <div class='col col--4'>
                    Job ID
                </div>
                <div class='col col--7'>
                    Source
                </div>

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
            <template v-else-if='!jobs.length'>
                <div class='w-full flex flex--center-main'>
                    <div class='py24'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                    </div>
                </div>
                <div class='w-full align-center txt-bold'>No Jobs Found</div>
                <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
            </template>
        </template>
    </div>
    -->
</template>

<script>
import Status from './Status.vue';
import {
    TablerBreadCrumb,
    TablerLoading
} from '@tak-ps/vue-tabler';
import {
    RefreshIcon
} from 'vue-tabler-icons';

export default {
    name: 'Run',
    props: ['runid'],
    data: function() {
        return {
            showFilter: false,
            filter: {
                source: '',
                layer: 'all',
                status: 'All'
            },
            run: {
                status: '',
                github: {}
            },
            count: {
                status: {
                    Pending: 0,
                    Warn: 0,
                    Fail: 0,
                    Success: 0
                }
            },
            jobs: [],
            loading: {
                count: true,
                run: true,
                jobs: true
            }
        };
    },
    mounted: async function() {
        await this.refresh();
    },
    watch: {
        showFilter: function() {
            this.filter.source = '';
            this.filter.layer = 'all';
            this.filter.status = 'All'
        },
        filter: {
            deep: true,
            handler: async function() {
                await this.getJobs();
            }
        }
    },
    methods: {
        filterShortcut: function(filter) {
            this.showFilter = true;
            this.$nextTick(() => {
                this.filter.status = filter;
            });
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        refresh: async function() {
            await this.fetchRun();
            await this.fetchCount();
            await this.fetchJobs();
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` });
        },
        github: function(run) {
            this.external(`https://github.com/openaddresses/openaddresses/commit/${run.github.sha}`);
        },
        fetchRun: async function() {
            this.loading.run = true;
            this.run = await window.std(`/api/run/${this.runid}`);
            this.loading.run = false;
        },
        fetchCount: async function() {
            this.loading.count = true;
            this.count = await window.std(window.location.origin + `/api/run/${this.runid}/count`);
            this.loading.count = false;
        },
        fetchJobs: async function() {
            this.loading.jobs = true;

            const url = new URL(`${window.location.origin}/api/job`);
            url.searchParams.set('run', this.runid);
            if (this.filter.source.length > 0) url.searchParams.set('source', this.filter.source);
            if (this.filter.layer !== 'all') url.searchParams.set('layer', this.filter.layer);
            if (this.filter.status !== 'All') url.searchParams.set('status', this.filter.status);

            this.jobs = await window.std(url);
            this.loading.jobs = false;
        }
    },
    components: {
        TablerBreadCrumb,
        TablerLoading,
        RefreshIcon,
        Status
    },
}
</script>
