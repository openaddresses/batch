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

                        <TablerLoading v-if='loading' desc='Loading Errors'/>
                        <TablerNone v-else-if='!list.total' label='Errors' :create='false'/>
                        <table v-else class="table table-hover table-vcenter card-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Job ID</th>
                                    <th>Job Name</th>
                                    <th>Attributes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template :key='error.job' v-for='error in list.errors'>
                                    <tr @click='$router.push(`/job/${error.job}`);' class='cursor-pointer'>
                                        <td><Status :status='error.status'/></td>
                                        <td>Job <span v-text='error.job'/></td>
                                        <td><span v-text='`${error.source_name} - ${error.layer} - ${error.name}`'/></td>
                                        <td>
                                            <div class='d-flex'>
                                                <div class='ms-auto btn-list'>
                                                    <ErrorsModerate
                                                        :error='error'
                                                        @moderated="list.errors.splice(i, 1)"
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan='4'>
                                            <div :key='message' v-for='message in error.messages' class='text-center w-full' v-text='message'></div>
                                        </td>
                                    </tr>
                                </template>
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
        <div class='col col--12 py3'>
            <div :key='message' v-for='message in error.messages' class='align-center w-full' v-text='message'></div>
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
import ErrorsModerate from './util/ErrorsModerate.vue';
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
                sort: 'job',
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
