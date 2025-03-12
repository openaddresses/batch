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
                    <div class='col-12'>
                        <div class='card'>
                            <div class='card-header'>
                                <h3 class='card-title'>
                                    Jobs
                                </h3>

                                <div class='ms-auto btn-list'>
                                    <IconSearch
                                        class='cursor-pointer'
                                        size='32'
                                        stroke='1'
                                        @click='showFilter = !showFilter'
                                    />
                                    <IconRefresh
                                        class='cursor-pointer'
                                        size='32'
                                        stroke='1'
                                        @click='fetchJobs'
                                    />
                                </div>
                            </div>
                            <template v-if='showFilter'>
                                <div class='card-body row'>
                                    <div class='col-12 col-md-6'>
                                        <QuerySource @source='paging.source = $event' />
                                    </div>
                                    <div class='col-12 col-md-3'>
                                        <QueryLayer @layer='paging.layer = $event' />
                                    </div>
                                    <div class='col-12 col-md-3'>
                                        <QueryStatus @status='paging.status = $event' />
                                    </div>
                                </div>
                            </template>

                            <TablerLoading
                                v-if='loading'
                                desc='Loading Jobs'
                            />
                            <table
                                v-else
                                class='table table-hover table-vcenter card-table'
                            >
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Job ID</th>
                                        <th>Created</th>
                                        <th>Source</th>
                                        <th>
                                            <div class='d-flex'>
                                                <div class='ms-auto'>
                                                    Attributes
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for='job in list.jobs'
                                        :key='job.id'
                                        class='cursor-pointer'
                                        @click='$router.push(`/job/${job.id}`);'
                                    >
                                        <td><Status :status='job.status' /></td>
                                        <td>
                                            <LayerIcon
                                                class='mr-3'
                                                :layer='job.layer'
                                            />
                                            <span v-text='job.id' />
                                        </td>
                                        <td><span v-text='fmt(job.created)' /></td>
                                        <td>
                                            <span v-text='`${job.source_name} - ${job.layer} - ${job.name}`' />
                                        </td>
                                        <td>
                                            <div class='d-flex'>
                                                <div
                                                    class='ms-auto btn-list'
                                                    @click.stop.prevent=''
                                                >
                                                    <Download
                                                        :auth='auth'
                                                        :job='job'
                                                        @login='$emit("login")'
                                                        @perk='$emit("perk", $event)'
                                                    />
                                                    <span @click.stop.prevent='external(job.source)'>
                                                        <IconBrandGithub
                                                            class='cursor-pointer'
                                                            size='32'
                                                            stroke='1'
                                                        />
                                                    </span>
                                                    <span
                                                        v-if='job.loglink'
                                                        @click.stop.prevent='$router.push(`/job/${job.id}/log`)'
                                                    >
                                                        <IconNotes
                                                            class='cursor-pointer'
                                                            size='32'
                                                            stroke='1'
                                                        />
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <TableFooter
                                :limit='paging.limit'
                                :total='list.total'
                                @page='paging.page = $event'
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {
    IconSearch,
    IconBrandGithub,
    IconRefresh,
    IconNotes
} from '@tabler/icons-vue'
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
    components: {
        IconSearch,
        IconBrandGithub,
        IconRefresh,
        IconNotes,
        Download,
        Status,
        TablerLoading,
        TablerBreadCrumb,
        TableFooter,
        LayerIcon,
        QueryStatus,
        QuerySource,
        QueryLayer
    },
    props: [ 'auth' ],
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
    watch: {
        paging: {
            deep: true,
            handler: async function() {
                await this.fetchJobs();
            }
        }
    },
    mounted: function() {
        this.fetchJobs();
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
}
</script>
