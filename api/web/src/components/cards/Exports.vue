<template>
<div class='card'>
    <div class='card-header'>
        <h3 class='card-title'>Exports</h3>
        <div class='d-flex ms-auto btn-list'>
            <RefreshIcon @click='refresh' class='cursor-pointer'/>
        </div>
    </div>
    <TablerLoading v-if='loading' desc='Loading Exports'/>
    <TablerNone v-else-if='!exps.length'/>
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
                <tr @click='$router.push(`/export/${exp.id}`);' :key='exp.id' v-for='exp in exps' class='cursor-pointer'>
                    <td><Status :status='exp.status'/></td>
                    <td><span class='pl6' v-text='"Export #" + exp.id + " - " + exp.source_name + " - " + exp.layer + " - " + exp.name'/></td>
                    <td><span v-text='fmt(exp.created)'/></td>
                    <td><span class='fr pr12' v-text='exp.format'/></td>
                </tr>
            </tbody>
        </table>

        <TablerPager v-if='exps.length' @page='page = $event' :perpage='perpage' :total='total'/>
    </template>
</div>
</template>

<script>
import Status from '../util/Status.vue';
import moment from 'moment-timezone';
import {
    TablerPager,
    TablerLoading,
    TablerNone,
} from '@tak-ps/vue-tabler';
import {
    RefreshIcon
} from 'vue-tabler-icons';

export default {
    name: 'CardExports',
    props: [ 'profile' ],
    data: function() {
        return {
            tz: moment.tz.guess(),
            exps: [],
            page: 0,
            perpage: 10,
            total: 100,
            loading: false
        };
    },
    mounted: function() {
        this.refresh();
    },
    watch: {
        page: function() {
            this.getExports();
        },
    },
    methods: {
        refresh: function() {
            this.getExports();
        },
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD hh:mm');
        },
        getExports: async function() {
            try {
                this.loading = true;

                const url = new URL(`${window.location.origin}/api/export`);
                url.searchParams.append('limit', this.perpage)
                url.searchParams.append('page', this.page)

                if (this.profile) {
                    url.searchParams.append('uid', this.profile.uid)
                }

                const res = await window.std(url);
                this.exps = res.exports;
                this.total = res.total;

                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        RefreshIcon,
        TablerPager,
        TablerLoading,
        TablerNone,
        Status
    }
}
</script>
