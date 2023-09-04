<template>
<div class='page-body'>
    <div class='container-xl'>
        <div class='row row-deck row-cards'>
            <div class='col-12'>
                <div class='card'>
                    <div class='card-header'>
                        <h3 class='card-title' v-text='location.name'></h3>
                    </div>
                    <div class='card-body row'>
                        <TablerLoading v-if='loading'/>
                        <template v-else>
                            <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                                <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                            </button>

                            <div class='col-12'>
                                <Coverage
                                    @err='$emit("err", $event)'
                                    :filter='locid'
                                    :bbox='location.bbox'
                                />
                            </div>

                            <table class="table table-vcenter card-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Updated</th>
                                        <th>Size</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr :key='job.id' v-for='job in jobs'>
                                        <td @click='emitjob(job.job)'>
                                            <span v-text='job.layer'/> - <span v-text='job.name'/>
                                        </td>
                                        <td v-text='fmt(job.updated)'></td>
                                        <td class='d-flex'>
                                            <span v-text='size(job.size)'/>
                                            <div class='ms-auto btn-list'>
                                                <Download :auth='auth' :job='job' @login='$emit("login")' @perk='$emit("perk", $event)'/>
                                                <template v-if='auth && auth.access === "admin"'>
                                                    <TablerDropdown>
                                                        <slot>
                                                            <SettingsIcon class='cursor-pointer'/>
                                                        </slot>
                                                        <template #dropdown>
                                                            <TablerToggle @change='updateData(job)' v-model='job.fabric' label='Fabric'/>
                                                        </template>
                                                    </TablerDropdown>
                                                </template>

                                                <HistoryIcon v-on:click.stop.prevent='emithistory(job.id)' class='cursor-pointer'/>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div class='col-12 align-center'>
                                OpenAddresses tracks free &amp; open data for <span v-text='location.name'/> including <span v-text='types.join(", ")'/>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import {
    HistoryIcon,
    SettingsIcon
} from 'vue-tabler-icons';
import {
    TablerLoading,
    TablerDropdown,
    TablerToggle
} from '@tak-ps/vue-tabler';
import Download from './util/Download.vue';
import Coverage from './util/Coverage.vue';
import moment from 'moment-timezone';

export default {
    name: 'Location',
    props: [ 'auth', 'locid' ],
    mounted: function() {
        this.refresh();
    },
    data: function() {
        return {
            tz: moment.tz.guess(),
            location: {},
            jobs: [],
            loading: false,
            types: []
        };
    },
    methods: {
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD');
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` });
        },
        emithistory: function(jobid) {
            this.$router.push({ path: `/data/${jobid}/history` })
        },
        size: function(bytes) {
            if (bytes == 0) { return "0.00 B"; }
            var e = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes/Math.pow(1024, e)).toFixed(2)+' '+' KMGTP'.charAt(e)+'B';
        },
        refresh: function() {
            this.getLocation();
            this.getJobs();
        },
        getLocation: async function() {
            try {
                this.loading = true;
                this.location = await window.std(window.location.origin + `/api/map/${this.locid}`);
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
        getJobs: async function() {
            try {
                this.jobs = await window.std(window.location.origin + `/api/data?map=${this.locid}`);
                this.types = this.jobs.map(j => j.layer).sort();
            } catch(err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        Download,
        Coverage,
        TablerLoading,
        TablerDropdown,
        TablerToggle,
        HistoryIcon,
        SettingsIcon
    },
}
</script>
