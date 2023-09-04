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
                            <h3 class='card-title'>Job Errors</h3>

                            <div class='ms-auto btn-list'>
                                <SearchIcon @click='showFilter = !showFilter' class='cursor-pointer'/>
                                <RefreshIcon @click='fetchProblems' class='cursor-pointer'/>
                            </div>
                        </div>
                        <template v-if='showFilter'>
                            <div class='card-body row'>
                                <div class='col-12 col-md-6'>
                                    <QuerySource @source='filter.source = $event'/>
                                </div>
                                <div class='col-12 col-md-3'>
                                    <QueryLayer @layer='filter.layer = $event' />
                                </div>
                                <div class='col-12 col-md-3'>
                                    <QueryStatus @status='filter.status = $event'/>
                                </div>
                            </div>
                        </template>

                        <TablerLoading v-if='loading' desc='Loading Runs'/>
                        <TablerNone v-else-if='!list.total' label='Errors' :create='false'/>
                        <table v-else class="table table-hover table-vcenter card-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Run ID</th>
                                    <th>Created</th>
                                    <th>Attributes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr @click='$router.push(`/run/${run.id}`);' :key='run.id' v-for='run in list.errors' class='cursor-pointer'>
                                    <td><Status :status='run.status'/></td>
                                    <td>Run <span v-text='run.id'/></td>
                                    <td><span v-text='fmt(run.created)'/></td>
                                    <td>
                                        <div class='d-flex'>
                                            <div class='ms-auto btn-list'>
                                                <span v-if='run.live' class="badge bg-green text-white">Live</span>
                                                <span v-if='run.github.sha' v-on:click.stop.prevent='github(run)' class="badge bg-blue text-white">Github</span>
                                            </div>
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

<!--
        <template v-else-if='!problems.length'>
            <div class='flex flex--center-main w-full'>
                <div class='py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Errors Found</div>
            <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
        </template>
        <template v-else>
            <div @click='$router.push({ path: `/job/${error.job}` })' :key='error.job' v-for='(error, i) in problems' class='col col--12 grid'>
                <div class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--1'>
                        <Status :status='error.status'/>
                    </div>
                    <div class='col col--1'>
                        Job <span v-text='error.job'/>
                    </div>
                    <div class='col col--6'>
                        <span v-text='`${error.source_name} - ${error.layer} - ${error.name}`'/>
                    </div>
                    <div class='col col--4'>
                        <ErrorsModerate
                            :error='error'
                            @moderated="problems.splice(i, 1)"
                        />
                    </div>

                    <div class='col col--12 py3'>
                        <div :key='message' v-for='message in error.messages' class='align-center w-full' v-text='message'></div>
                    </div>
                </div>
            </div>

        </template>
    </div>
-->
</template>

<script>
import {
    RefreshIcon,
    SearchIcon
} from 'vue-tabler-icons';
import Status from './util/Status.vue';
import QueryStatus from './query/Status.vue';
import QuerySource from './query/Source.vue';
import QueryLayer from './query/Layer.vue';
import ErrorsModerate from './ErrorsModerate.vue';
import TableFooter from './util/TableFooter.vue';
import {
    TablerNone,
    TablerLoading,
    TablerBreadCrumb
} from '@tak-ps/vue-tabler';

export default {
    name: 'Errors',
    props: [ ],
    data: function() {
        return {
            loading: true,
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
                problems: []
            }
        };
    },
    mounted: async function() {
        await this.fetchProblems();
    },
    watch: {
        problems: function() {
            this.$emit('errors', this.problems.length);
        },
        paging: {
            deep: true,
            handler: async function() {
                await this.fetchRuns();
            }
        }
    },
    methods: {
        fetchProblems: async function() {
            try {
                this.loading = true;

                const url = window.stdurl('/api/job/error');
                url.searchParams.append('limit', this.paging.limit);
                url.searchParams.append('page', this.paging.page);
                url.searchParams.append('filter', this.paging.filter);
                url.searchParams.append('order', this.paging.order);
                if (this.paging.source !== '') url.searchParams.set('source', this.paging.source);
                if (this.paging.layer !== 'all') url.searchParams.set('layer', this.paging.layer);
                if (this.paging.status !== 'All') url.searchParams.set('status', this.paging.status);

                this.list = await window.std(url);

                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
        external: function(url) {
            window.open(url, "_blank");
        }
    },
    components: {
        SearchIcon,
        RefreshIcon,
        Status,
        QueryStatus,
        QuerySource,
        QueryLayer,
        ErrorsModerate,
        TablerBreadCrumb,
        TablerLoading,
        TablerNone,
        TableFooter
    },
}
</script>
