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
                            <h3 class='card-title' v-text='data.source + " - " + data.layer + " - " + data.name'/>

                            <div class='ms-auto btn-list'>
                                <IconRefresh @click='refresh' class='cursor-pointer' size='32'/>
                            </div>
                        </div>

                        <TablerLoading v-if='loading.history' :desc='`Loading Job History`'/>
                        <template v-else>
                            <h2 class='subheader mx-3 my-3'>Stats History</h2>

                            <TablerLoading v-if='loading.history' desc='Loading Stats'/>
                            <template v-else>
                                <div class='card-body'>
                                    <LineChart class='w-100' style='height: 200px' :data='chart' :options='{
                                        "scales": {
                                            "xAxis": {
                                                "type": "time",
                                                "time": {
                                                    "unit": "day"
                                                },
                                                "distribution": "linear"
                                            },
                                            "yAxis": {
                                                "ticks": {
                                                    "beginAtZero": true
                                                }
                                            }
                                        }
                                    }'/>
                                </div>
                            </template>

                            <h2 class='subheader mx-3 my-3'>Job History</h2>

                            <table class="table table-hover table-vcenter card-table">
                                <thead>
                                    <tr>
                                        <th>Status</th>
                                        <th>Job ID</th>
                                        <th>Updated</th>
                                        <th>Attributes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr :key='job.id' v-for='job in computedPage'>
                                        <td>
                                            <Status :status='job.status'/>
                                        </td>
                                        <td v-text='job.id'/>
                                        <td>
                                            <span v-text='fmt(job.created)'></span>
                                        </td>
                                        <td>
                                            <div class='d-flex'>
                                                <div class='ms-auto'>
                                                    <IconDownload v-if='job.output.output' v-on:click.stop.prevent='datapls(job.id)' class='cursor-pointer' size='32'/>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <TableFooter :limit='paging.limit' :total='history.jobs.length' @page='paging.page = $event'/>
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
    TablerBreadCrumb,
    TablerLoading,
} from '@tak-ps/vue-tabler';
import TableFooter from './util/TableFooter.vue';
import Status from './util/Status.vue';
import {
    IconRefresh,
    IconDownload
} from '@tabler/icons-vue';
import { Line as LineChart } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, LinearScale, TimeScale, PointElement, LineElement, CategoryScale } from 'chart.js'
import moment from 'moment-timezone';

ChartJS.register(Title, Tooltip, Legend, BarElement, LinearScale, TimeScale, PointElement, LineElement, CategoryScale)

import 'chartjs-adapter-date-fns';

export default {
    name: 'History',
    props: ['dataid'],
    data: function() {
        return {
            tz: moment.tz.guess(),
            loading: {
                history: true
            },
            paging: {
                limit: 10,
                page: 0
            },
            colours: [ /* Thanks for the colours! https://github.com/johannesbjork/LaCroixColoR */ ],
            chart: {
                datasets: [{
                    label: 'Feature Count',
                    data: []
                }]
            },
            data: {},
            history: {
                jobs: []
            }
        }
    },
    mounted: function() {
        this.colours = [
            '#EA7580','#F6A1A5','#F8CD9C','#1BB6AF','#088BBE','#172869' // Pamplemousse
        ]
        this.refresh();
    },
    computed: {
        computedPage: function() {
            return this.history.jobs.slice(this.paging.limit * this.paging.page, this.paging.limit * (this.paging.page + 1))
        }
    },
    methods: {
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD');
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}`});
        },
        refresh: async function() {
            await this.getData();
            this.getHistory();
        },
        datapls: function(id) {
            this.external(`${window.location.origin}/api/job/${id}/output/source.geojson.gz?token=${localStorage.token}`);
        },
        external: function(url) {
            window.open(url, '_blank');
        },
        getHistory: async function() {
            try {
                this.loading.history = true;
                this.history = await window.std(`/api/data/${this.dataid}/history`);

                this.chart = {
                    datasets: [{
                        label: 'Features',
                        fill: false,
                        borderColor: this.colours.pop(),
                        data: this.history.jobs.map((ele) => {
                            return { x: ele.created, y: ele.count }
                        })
                    }]
                };

                if (this.data.layer === 'addresses') {
                    this.chart.datasets.push({
                        label: 'Numbers',
                        fill: false,
                        borderColor: this.colours.pop(),
                        data: this.history.jobs.map((ele) => {
                            return { x: ele.created, y: ele.stats.counts.number }
                        })
                    });

                    this.chart.datasets.push({
                        label: 'Streets',
                        fill: false,
                        borderColor: this.colours.pop(),
                        data: this.history.jobs.map((ele) => {
                            return { x: ele.created, y: ele.stats.counts.street }
                        })
                    });

                    this.chart.datasets.push({
                        label: 'Cities',
                        fill: false,
                        borderColor: this.colours.pop(),
                        data: this.history.jobs.map((ele) => {
                            return { x: ele.created, y: ele.stats.counts.city }
                        })
                    });

                    this.chart.datasets.push({
                        label: 'Postcodes',
                        fill: false,
                        borderColor: this.colours.pop(),
                        data: this.history.jobs.map((ele) => {
                            return { x: ele.created, y: ele.stats.counts.postcode }
                        })
                    });
                }

                this.loading.history = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        getData: async function() {
            try {
                this.data = await window.std(`/api/data/${this.dataid}`);
            } catch (err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        Status,
        IconRefresh,
        IconDownload,
        TablerLoading,
        TableFooter,
        LineChart,
        TablerBreadCrumb,
    },
}
</script>
