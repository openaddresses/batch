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
                            <h3 class='card-title'>Jobs</h3>

                            <div class='ms-auto btn-list'>
                                <SearchIcon @click='showFilter = !showFilter' class='cursor-pointer'/>
                                <RefreshIcon @click='fetchJobs' class='cursor-pointer'/>
                            </div>
                        </div>
                        <template v-if='showFilter'>
                            <div class='card-body row'>
                                <div class='col-12 col-md-6'>
                                    <QuerySource @source='paging.source = $event'/>
                                </div>
                                <div class='col-12 col-md-3'>
                                    <QueryLayer @layer='paging.layer = $event' />
                                </div>
                                <div class='col-12 col-md-3'>
                                    <QueryStatus @status='paging.status = $event'/>
                                </div>
                            </div>
                        </template>

                        <TablerLoading v-if='loading' desc='Loading Jobs'/>
                        <table v-else class="table table-hover table-vcenter card-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Job ID</th>
                                    <th>Created</th>
                                    <th>Source</th>
                                    <th>Attributes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr @click='$router.push(`/job/${job.id}`);' :key='job.id' v-for='job in list.jobs' class='cursor-pointer'>
                                    <td><Status :status='job.status'/></td>
                                    <td>
                                        <LayerIcon class='mr-3' :layer='job.layer'/>
                                        <span v-text='job.id'/>
                                    </td>
                                    <td><span v-text='fmt(job.created)'/></td>
                                    <td>
                                        <span v-text='`${job.source_name} - ${job.layer} - ${job.name}`'/>
                                    </td>
                                    <td>
                                        <div v-on:click.stop.prevent='' class='btn-list'>
                                            <Download :auth='auth' :job='job' @login='$emit("login")' @perk='$emit("perk", $event)'/>
                                            <span v-on:click.stop.prevent='external(job.source)'>
                                                <BrandGithubIcon class='cursor-pointer'/>
                                            </span>
                                            <span v-on:click.stop.prevent='$router.push(`/job/${job.id}/log`)' v-if='job.loglink'>
                                                <NotesIcon class='cursor-pointer'/>
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <TableFooter :limit='paging.limit' :total='list.total' @page='paging.page = $event'/>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import {
    SearchIcon,
    BrandGithubIcon,
    RefreshIcon,
    NotesIcon
} from 'vue-tabler-icons'
import LayerIcon from './util/LayerIcon.vue';
import Status from './util/Status.vue';
import Download from './util/Download.vue';
import moment from 'moment-timezone';
import TableFooter from './util/TableFooter.vue';
import QueryStatus from './query/Status.vue';
import QuerySource from './query/Source.vue';
import QueryLayer from './query/Layer.vue';
import {
    TablerLoading,
    TablerBreadCrumb
} from '@tak-ps/vue-tabler';

export default {
    name: 'Jobs',
    props: [ 'auth' ],
    mounted: function() {
        this.fetchJobs();
    },
    watch: {
        paging: {
            deep: true,
            handler: async function() {
                await this.fetchJobs();
            }
        }
    },
    data: function() {
        return {
            tz: moment.tz.guess(),
            showFilter: false,
            paging: {
                source: '',
                layer: 'all',
                status: 'All',
                sort: 'id',
                order: 'desc',
                limit: 100,
                page: 0
            },
            list: {
                total: 0,
                jobs: []
            },
            loading: false
        };
    },
    methods: {
        external: function(url) {
            window.open(url, "_blank");
        },
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD hh:mm');
        },
        fetchJobs: async function() {
            try {
                this.loading = true;

                const url = window.stdurl('/api/job');
                url.searchParams.append('limit', this.paging.limit);
                url.searchParams.append('page', this.paging.page);
                url.searchParams.append('source', this.paging.source);
                url.searchParams.append('order', this.paging.order);
                if (this.showFilter) {
                    if (this.paging.source !== '') url.searchParams.set('source', this.paging.source);
                    if (this.paging.layer !== 'all') url.searchParams.set('layer', this.paging.layer);
                    if (this.paging.status !== 'All') url.searchParams.set('status', this.paging.status);
                }

                this.list = await window.std(url);

                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        SearchIcon,
        Download,
        RefreshIcon,
        Status,
        BrandGithubIcon,
        NotesIcon,
        TablerLoading,
        TablerBreadCrumb,
        TableFooter,
        LayerIcon,
        QueryStatus,
        QuerySource,
        QueryLayer
    },
}
</script>
