<template>
<div class='page-body'>
    <div class='container-xl'>
        <div class='row row-deck row-cards'>
            <div class='col-12'>
                <div class='card'>
                    <div class='card-header'>
                        <div class='d-flex'>
                            <h3 class='card-title'>Source Runs</h3>

                            <div class='ms-auto btn-list'>
                                <RefreshIcon @click='fetchRuns' class='cursor-pointer'/>
                            </div>
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
                            <tr :key='run.id' v-for='run in runs' class='cursor-pointer'>
                                <th><Status :status='run.status'/></th>
                                <th>Run <span v-text='run.id'/></th>
                                <th><span v-text='fmt(run.created)'/></th>
                                <th>
                                    <span v-if='run.live' class='fr mx6 bg-green-faint bg-green-on-hover color-white-on-hover color-green inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Live</span>
                                    <span v-on:click.stop.prevent='github(run)' v-if='run.github.sha' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Github</span>
                                </th>
                            </tr>
                        </tbody>
                    </table>
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
    TablerLoading
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
        emitrun: function(run_id) {
            this.$router.push({ path: `/run/${run_id}` });
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
        TablerLoading
    }
}
</script>
