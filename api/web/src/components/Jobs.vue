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
                            <h3 class='card-title'>Jobs</h3>

                            <div class='ms-auto btn-list'>
                                <RefreshIcon @click='fetchJobs' class='cursor-pointer'/>
                            </div>
                        </div>

                        <TablerLoading v-if='loading' desc='Loading Jobs'/>
                        <table v-else class="table table-hover table-vcenter card-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Job ID</th>
                                    <th>Created</th>
                                    <th>Source</th>
                                    <th>Attributes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr @click='$router.push(`/job/${job.id}`);' :key='job.id' v-for='job in jobs' class='cursor-pointer'>
                                    <td><Status :status='job.status'/></td>
                                    <td>Job <span v-text='job.id'/></td>
                                    <td><span v-text='fmt(job.created)'/></td>
                                    <td>
                                        <span v-text='`${job.source_name} - ${job.layer} - ${job.name}`'/>
                                    </td>
                                    <td>
                                        <div class='btn-list'>
                                            <Download :auth='auth' :job='job' @login='$emit("login")' @perk='$emit("perk", $event)'/>
                                            <span v-on:click.stop.prevent='external(job.source)'>
                                                <BrandGithubIcon class='cursor-pointer'/>
                                            </span>
                                            <span v-on:click.stop.prevent='$router.push(`/job/${job.id}/log`)' v-if='job.loglink'>
                                                <NotesIcon class='cursor-pointer'/>
                                            </span>
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
import {
    BrandGithubIcon,
    RefreshIcon,
    NotesIcon
} from 'vue-tabler-icons'
import Status from './util/Status.vue';
import Download from './Download.vue';
import moment from 'moment-timezone';
import {
    TablerLoading,
    TablerBreadCrumb
} from '@tak-ps/vue-tabler';

export default {
    name: 'Jobs',
    props: [ 'auth' ],
    mounted: function() {
        this.fetchJobs();
    },
    data: function() {
        return {
            tz: moment.tz.guess(),
            jobs: [],
            loading: false
        };
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
                this.jobs = await window.std(window.location.origin + '/api/job');
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        Download,
        RefreshIcon,
        Status,
        BrandGithubIcon,
        NotesIcon,
        TablerLoading,
        TablerBreadCrumb
    },
}
</script>
