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
                                <h3
                                    class='card-title'
                                    v-text='location.name'
                                />
                            </div>
                            <div class='card-body row'>
                                <TablerLoading v-if='loading' />
                                <template v-else>
                                    <div class='col-12'>
                                        <Coverage
                                            :filter='locid'
                                            :bbox='location.bbox'
                                            :features='{
                                                type: "FeatureCollection",
                                                features: [{
                                                    type: "Feature",
                                                    properties: {},
                                                    geometry: location.geom
                                                }]
                                            }'
                                            @err='$emit("err", $event)'
                                        />
                                    </div>

                                    <div class='table-responsive'>
                                        <table class='table table-hover table-vcenter card-table'>
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Updated</th>
                                                    <th>Size</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr
                                                    v-for='job in jobs'
                                                    :key='job.id'
                                                >
                                                    <td
                                                        class='cursor-pointer'
                                                        @click='emitjob(job.job)'
                                                    >
                                                        <span v-text='job.layer' /> - <span v-text='job.name' />
                                                    </td>
                                                    <td v-text='fmt(job.updated)' />
                                                    <td class='d-flex'>
                                                        <span v-text='size(job.size)' />
                                                        <div class='ms-auto btn-list'>
                                                            <Download
                                                                :auth='auth'
                                                                :job='job'
                                                                @login='$emit("login")'
                                                                @perk='$emit("perk", $event)'
                                                            />
                                                            <template v-if='auth && auth.access === "admin"'>
                                                                <TablerDropdown>
                                                                    <slot>
                                                                        <IconSettings
                                                                            size='32'
                                                                            class='cursor-pointer'
                                                                        />
                                                                    </slot>
                                                                    <template #dropdown>
                                                                        <TablerToggle
                                                                            v-model='job.fabric'
                                                                            label='Fabric'
                                                                            @change='updateData(job)'
                                                                        />
                                                                    </template>
                                                                </TablerDropdown>
                                                            </template>

                                                            <IconHistory
                                                                size='32'
                                                                class='cursor-pointer'
                                                                @click.stop.prevent='emithistory(job.id)'
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div class='col-12 text-center pt-3'>
                                        OpenAddresses tracks free &amp; open data for <span v-text='location.name' /> including <span v-text='types.join(", ")' />
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {
    IconHistory,
    IconSettings
} from '@tabler/icons-vue';
import {
    TablerLoading,
    TablerDropdown,
    TablerBreadCrumb,
    TablerToggle
} from '@tak-ps/vue-tabler';
import Download from './util/Download.vue';
import Coverage from './util/Coverage.vue';
import moment from 'moment-timezone';

export default {
    name: 'Location',
    components: {
        Download,
        Coverage,
        TablerLoading,
        TablerDropdown,
        TablerBreadCrumb,
        TablerToggle,
        IconHistory,
        IconSettings
    },
    props: [ 'auth', 'locid' ],
    data: function() {
        return {
            tz: moment.tz.guess(),
            location: {},
            jobs: [],
            loading: true,
            types: []
        };
    },
    mounted: async function() {
        await this.refresh();
    },
    methods: {
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD');
        },
        updateData: async function(job) {
            await window.std(`/api/data/${job.id}`, {
                method: 'PATCH',
                body: {
                    fabric: job.fabric
                }
            });
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
        refresh: async function() {
            this.loading = true;
            await this.getLocation();
            await this.getJobs();
            this.loading = false;
        },
        getLocation: async function() {
            this.location = await window.std(window.location.origin + `/api/map/${this.locid}`);
        },
        getJobs: async function() {
            this.jobs = await window.std(window.location.origin + `/api/data?map=${this.locid}`);
            this.types = this.jobs.map(j => j.layer).sort();
        }
    },
}
</script>
