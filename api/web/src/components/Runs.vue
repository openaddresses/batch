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
                            <h3 class='card-title'>Source Runs</h3>

                            <div class='ms-auto btn-list'>
                                <RefreshIcon @click='fetchRuns' class='cursor-pointer'/>
                            </div>
                        </div>

                        <TablerLoading v-if='loading' desc='Loading Runs'/>
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
                                <tr @click='$router.push(`/run/${run.id}`);' :key='run.id' v-for='run in runs' class='cursor-pointer'>
                                    <td><Status :status='run.status'/></td>
                                    <td>Run <span v-text='run.id'/></td>
                                    <td><span v-text='fmt(run.created)'/></td>
                                    <td>
                                        <div class='d-flex'>
                                            <div class='ms-auto btn-list'>
                                                <span v-if='run.live' class="badge bg-green">Live</span>
                                                <span v-if='run.github.sha' v-on:click.stop.prevent='github(run)' class="badge bg-blue">Github</span>
                                            </div>
                                        </div>
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
import Status from './Status.vue';
import moment from 'moment-timezone';
import {
    RefreshIcon
} from 'vue-tabler-icons';
import {
    TablerLoading,
    TablerBreadCrumb
} from '@tak-ps/vue-tabler';

export default {
    name: 'Runs',
    mounted: async function() {
        await this.fetchRuns();
    },
    data: function() {
        return {
            tz: moment.tz.guess(),
            loading: false,
            runs: []
        };
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
            this.runs = await window.std('/api/run');
            this.loading = false;
        }
    },
    components: {
        Status,
        RefreshIcon,
        TablerLoading,
        TablerBreadCrumb,
    }
}
</script>
