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
                                <RefreshIcon @click='refresh' class='cursor-pointer'/>
                            </div>
                        </div>

                        <TablerLoading v-if='loading.history' :desc='`Loading Job History`'/>
                        <template v-else>
                            <h2 class='subheader mx-3 my-3'>Stats History</h2>

                            <template v-if='loading'>
                                <div class='flex flex--center-main w-full py24'>
                                    <div class='loading'></div>
                                </div>
                            </template>
                            <template v-else>
                                <LineChart class='w-full mb24' style='height: 200px' :chart-data='chart' :chart-options='{
                                    "maintainAspectRatio": false,
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
                                    <tr :key='job.id' v-for='job in history.jobs'>
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
                                                    <DownloadIcon v-if='job.output.output' v-on:click.stop.prevent='datapls(job.id)' class='cursor-pointer'/>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
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
import Status from './util/Status.vue';
import {
    RefreshIcon,
    DownloadIcon
} from 'vue-tabler-icons';
import { Line as LineChart } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, LinearScale, TimeScale, PointElement, LineElement } from 'chart.js'
import moment from 'moment-timezone';

ChartJS.register(Title, Tooltip, Legend, BarElement, LinearScale, TimeScale, PointElement, LineElement)

import 'chartjs-adapter-date-fns';

export default {
    name: 'History',
    props: ['dataid'],
    data: function() {
        return {
            tz: moment.tz.guess(),
            loading: {

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
        RefreshIcon,
        TablerLoading,
        LineChart,
        TablerBreadCrumb,
        DownloadIcon
    },
}
</script>
