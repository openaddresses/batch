<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>
                    Daily Traffic:
                </h2>

                <div class='fr'>
                    <button @click='refresh' class='btn round btn--stroke color-gray mx3'>
                        <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                    </button>
                </div>
            </div>
        </div>

        <template v-if='loading.traffic'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <LineChart class='w-full' style='height: 200px' :chartData='traffic' options='{
                "maintainAspectRatio": false,
                "scales": {
                    "xAxes": [{
                        "type": "time",
                        "time": {
                            "unit": "day"
                        },
                        "distribution": "linear"
                    }],
                    "yAxes": [{
                        "ticks": {
                            "beginAtZero": true
                        }
                    }]
                }
            }'/>
        </template>
    </div>
</template>

<script>
import LineChart from './LineChart.js';

export default {
    name: 'ProfileAnalytics',
    props: [ ],
    components: {
        LineChart
    },
    data: function() {
        return {
            loading: {
                traffic: true,
            },
            traffic: {}
        };
    },
    mounted: function() {
        this.refresh();
    },
    methods: {
        refresh: function() {
            this.getTraffic();
        },
        getTraffic: function() {
            this.loading.traffic = true;

            const url = new URL(`${window.location.origin}/api/dash/traffic`);

            fetch(url, {
                method: 'GET'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to load traffic');
                }
                return res.json();
            }).then((res) => {
                res.datasets[0].data = res.datasets[0].data.map((d) => {
                    d.x = new Date(d.x);
                    return d;
                });

                this.traffic = res;
                this.loading.traffic = false;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
