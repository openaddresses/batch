<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid'>
            <div class='col col--12'>
                <h2 class='txt-h4 pb12 fl'>Runs:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
            <div class='col col--12 grid border-b border--gray-light'>
                <div class='col col--1'>
                    Status
                </div>
                <div class='col col--2'>
                    Run ID
                </div>
                <div class='col col--2'>
                    Created
                </div>
                <div class='col col--7'>
                    <span class='fr'>Attributes</span>
                </div>
            </div>

        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div @click='emitrun(run.id)' :key='run.id' v-for='run in runs' class='col col--12 grid'>
                <div class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--1'>
                        <Status :status='run.status'/>
                    </div>
                    <div class='col col--2'>
                        Run <span v-text='run.id'/>
                    </div>
                    <div class='col col--4'>
                        <span v-text='fmt(run.created)'/>
                    </div>
                    <div class='col col--5 pr12'>
                        <span v-if='run.live' class='fr mx6 bg-green-faint bg-green-on-hover color-white-on-hover color-green inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Live</span>
                        <span v-on:click.stop.prevent='github(run)' v-if='run.github.sha' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Github</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import Status from './Status.vue';
import moment from 'moment-timezone';

export default {
    name: 'Runs',
    mounted: function() {
        this.refresh();
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
        refresh: function() {
            this.getRuns();
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
        getRuns: function() {
            this.loading = true;
            fetch(window.location.origin + '/api/run', {
                method: 'GET'
            }).then((res) => {
                this.loading = false;

                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get runs');
                }
                return res.json();
            }).then((res) => {
                this.runs = res;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    },
    components: {
        Status
    }
}
</script>
