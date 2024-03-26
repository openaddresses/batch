<template>
<div class='card'>
    <div class='card-header'>
        <h3 class='card-title'>Exports</h3>
        <div class='d-flex ms-auto btn-list'>
            <IconRefresh @click='fetchExports' class='cursor-pointer' size='32'/>
        </div>
    </div>
    <TablerLoading v-if='loading' desc='Loading Exports'/>
    <TablerNone v-else-if='!list.total'/>
    <template v-else>
        <table class="table table-hover table-vcenter card-table">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Export ID</th>
                    <th>Created</th>
                    <th>Format</th>
                </tr>
            </thead>
            <tbody>
                <tr @click='$router.push(`/export/${exp.id}`);' :key='exp.id' v-for='exp in list.exports' class='cursor-pointer'>
                    <td><Status :status='exp.status'/></td>
                    <td><span class='pl6' v-text='"Export #" + exp.id + " - " + exp.source_name + " - " + exp.layer + " - " + exp.name'/></td>
                    <td><span v-text='fmt(exp.created)'/></td>
                    <td><span class='fr pr12' v-text='exp.format'/></td>
                </tr>
            </tbody>
        </table>

        <TableFooter :limit='paging.limit' :total='list.total' @page='paging.page = $event'/>
    </template>
</div>
</template>

<script>
import Status from '../util/Status.vue';
import moment from 'moment-timezone';
import TableFooter from '../util/TableFooter.vue';
import {
    TablerLoading,
    TablerNone,
} from '@tak-ps/vue-tabler';
import {
    IconRefresh
} from '@tabler/icons-vue';

export default {
    name: 'CardExports',
    props: [ 'profile' ],
    data: function() {
        return {
            tz: moment.tz.guess(),
            loading: false,
            list: {
                total: 0,
                exports: []
            },
            paging: {
                sort: 'id',
                order: 'desc',
                limit: 100,
                page: 0
            },
        };
    },
    mounted: async function() {
        await this.fetchExports();
    },
    watch: {
        paging: {
            deep: true,
            handler: async function() {
                await this.fetchJobs();
            }
        }
    },
    methods: {
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD hh:mm');
        },
        fetchExports: async function() {
            try {
                this.loading = true;

                const url = window.stdurl('/api/export');
                url.searchParams.append('limit', this.paging.limit);
                url.searchParams.append('page', this.paging.page);
                url.searchParams.append('source', this.paging.source);
                url.searchParams.append('order', this.paging.order);

                if (this.profile) {
                    url.searchParams.append('uid', this.profile.uid)
                }

                this.list = await window.std(url);

                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        IconRefresh,
        TableFooter,
        TablerLoading,
        TablerNone,
        Status
    }
}
</script>
