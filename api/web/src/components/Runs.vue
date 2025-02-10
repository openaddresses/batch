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
                                    Source Runs
                                </h3>

                                <div class='ms-auto btn-list'>
                                    <IconRefresh
                                        class='cursor-pointer'
                                        size='32'
                                        @click='fetchRuns'
                                    />
                                </div>
                            </div>

                            <TablerLoading
                                v-if='loading'
                                desc='Loading Runs'
                            />
                            <table
                                v-else
                                class='table table-hover table-vcenter card-table'
                            >
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Run ID</th>
                                        <th>Created</th>
                                        <th>Attributes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for='run in list.runs'
                                        :key='run.id'
                                        class='cursor-pointer'
                                        @click='$router.push(`/run/${run.id}`);'
                                    >
                                        <td><Status :status='run.status' /></td>
                                        <td>Run <span v-text='run.id' /></td>
                                        <td><span v-text='fmt(run.created)' /></td>
                                        <td>
                                            <div class='d-flex'>
                                                <div class='ms-auto btn-list'>
                                                    <span
                                                        v-if='run.live'
                                                        class='badge bg-green text-white'
                                                    >Live</span>
                                                    <span
                                                        v-if='run.github.sha'
                                                        class='badge bg-blue text-white cursor-pointer'
                                                        @click.stop.prevent='github(run)'
                                                    >Github</span>
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
import Status from './util/Status.vue';
import moment from 'moment-timezone';
import TableFooter from './util/TableFooter.vue';
import {
    IconRefresh
} from '@tabler/icons-vue';
import {
    TablerLoading,
    TablerBreadCrumb
} from '@tak-ps/vue-tabler';

export default {
    name: 'Runs',
    components: {
        Status,
        IconRefresh,
        TableFooter,
        TablerLoading,
        TablerBreadCrumb,
    },
    data: function() {
        return {
            tz: moment.tz.guess(),
            loading: false,
            paging: {
                filter: '',
                sort: 'id',
                order: 'desc',
                limit: 100,
                page: 0
            },
            list: {
                total: 0,
                runs: []
            }
        };
    },
    watch: {
        paging: {
            deep: true,
            handler: async function() {
                await this.fetchRuns();
            }
        }
    },
    mounted: async function() {
        await this.fetchRuns();
    },
    methods: {
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD hh:mm');
        },
        github: function(run) {
            this.external(`https://github.com/openaddresses/openaddresses/commit/${run.github.sha}`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        fetchRuns: async function() {
                this.loading = true;

                const url = window.stdurl('/api/run');
                url.searchParams.append('limit', this.paging.limit);
                url.searchParams.append('page', this.paging.page);
                url.searchParams.append('filter', this.paging.filter);
                url.searchParams.append('order', this.paging.order);

                this.list = await window.std(url);

                this.loading = false;
        }
    }
}
</script>
