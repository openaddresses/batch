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
                                <div class='mx-2 align-self-center'>
                                    Run <span v-text='$route.params.runid'/>
                                </div>
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

                        <TablerLoading v-if='loading.jobs' desc='Loading Jobs'/>
                        <TablerNone v-else-if='!jobs.jobs.length' :create='false'/>
                        <table v-else class="table table-hover table-vcenter card-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Job ID</th>
                                    <th>Created</th>
                                    <th>Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr @click='$router.push(`/job/${job.id}`);' :key='job.id' v-for='job in jobs.jobs' class='cursor-pointer'>
                                    <td><Status :status='job.status'/></td>
                                    <td>Job <span v-text='job.id'/></td>
                                    <td><span v-text='fmt(job.created)'/></td>
                                    <td>
                                        <span v-text='`${job.source_name} - ${job.layer} - ${job.name}`'></span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import moment from 'moment-timezone';
import Status from './util/Status.vue';
import TableFooter from './util/TableFooter.vue';
import {
    TablerNone,
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
            tz: moment.tz.guess(),
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
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD hh:mm');
        },
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
        TableFooter,
        TablerBreadCrumb,
        TablerLoading,
        TablerNone,
        RefreshIcon,
        Status
    },
}
</script>
