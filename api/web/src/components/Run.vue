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

                <button @click='showFilter = !showFilter' class='btn round btn--stroke fr color-gray mr12'>
                    <svg v-if='!showFilter' class='icon'><use href='#icon-search'/></svg>
                    <svg v-else class='icon'><use href='#icon-close'/></svg>
                </button>

                <span v-if='run.live' class='fr mx6 bg-green-faint bg-green-on-hover color-white-on-hover color-green inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Live</span>
                <span v-on:click.stop.prevent='github(run)' v-if='run.github.sha' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Github</span>

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

        <template v-if='loading.run'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 pt12'>
                <h2 class='txt-h4 pb12 fl'>Dashboard:</h2>

                <template v-if='loading.count'>
                    <div class='flex-parent flex-parent--center-main w-full'>
                        <div class='flex-child loading py24'></div>
                    </div>
                </template>
                <template v-else>
                    <div class='col col--12 grid border round border--gray-light'>
                        <div @click='filterShortcut("Pending")' class='col col--3 bg-gray-light-on-hover cursor-pointer'>
                            <div class='align-center' v-text='count.status.Pending'></div>
                            <div class='flex-parent flex-parent--center-main w-full'>
                                <div class='flex-child'>
                                    <Status status='Pending' class='fl'/> Pending
                                </div>
                            </div>
                        </div>
                        <div @click='filterShortcut("Warn")' class='col col--3 bg-gray-light-on-hover cursor-pointer'>
                            <div class='align-center' v-text='count.status.Warn'></div>
                            <div class='flex-parent flex-parent--center-main w-full'>
                                <div class='flex-child'>
                                    <Status status='Warn' class='fl'/> Warn
                                </div>
                            </div>
                        </div>
                        <div @click='filterShortcut("Fail")' class='col col--3 bg-gray-light-on-hover cursor-pointer'>
                            <div class='align-center' v-text='count.status.Fail'></div>
                            <div class='flex-parent flex-parent--center-main w-full'>
                                <div class='flex-child'>
                                    <Status status='Fail' class='fl'/> Fail
                                </div>
                            </div>
                        </div>
                        <div @click='filterShortcut("Success")' class='col col--3 bg-gray-light-on-hover cursor-pointer'>
                            <div class='align-center' v-text='count.status.Success'></div>
                            <div class='flex-parent flex-parent--center-main w-full'>
                                <div class='flex-child'>
                                    <Status status='Success' class='fl'/> Success
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>

            <div class='col col--12 pt12'>
                <h2 class='txt-h4 pb12 fl'>Jobs:</h2>
            </div>

            <template v-if='loading.jobs'>
                <div class='flex-parent flex-parent--center-main w-full'>
                    <div class='flex-child loading py24'></div>
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
                <div class='w-full flex-parent flex-parent--center-main'>
                    <div class='flex-child py24'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                    </div>
                </div>
                <div class='w-full align-center txt-bold'>No Jobs Found</div>
                <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
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
    mounted: function() {
        this.refresh();
    },
    components: {
        Status
    },
    watch: {
        showFilter: function() {
            this.filter.source = '';
            this.filter.layer = 'all';
            this.filter.status = 'All'
        },
        'filter.status': function() {
            this.getJobs();
        },
        'filter.layer': function() {
            this.getJobs();
        },
        'filter.source': function() {
            this.getJobs();
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
        refresh: function() {
            this.getRun();
            this.getCount();
            this.getJobs();
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` });
        },
        github: function(run) {
            this.external(`https://github.com/openaddresses/openaddresses/commit/${run.github.sha}`);
        },
        getRun: async function() {
            try {
                this.loading.run = true;
                this.run = await window.std(`/api/run/${this.runid}`);
                this.loading.run = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        getCount: async function() {
            try {
                this.loading.count = true;
                this.count = await window.std(window.location.origin + `/api/run/${this.runid}/count`);
                this.loading.count = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        getJobs: async function() {
            try {
                this.loading.jobs = true;

                const url = new URL(`${window.location.origin}/api/job`);
                url.searchParams.set('run', this.runid);
                if (this.filter.source.length > 0) url.searchParams.set('source', this.filter.source);
                if (this.filter.layer !== 'all') url.searchParams.set('layer', this.filter.layer);
                if (this.filter.status !== 'All') url.searchParams.set('status', this.filter.status);

                this.jobs = await window.std(url);
                this.loading.jobs = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
