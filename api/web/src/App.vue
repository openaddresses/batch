<template>
    <div id='app' class='col col--12'>
        <div class='col col--12 px12 py12 border-b border--gray'>
            <img @click='external("https://openaddresses.io")' class='h24 w24 round mr12 cursor-pointer' src='../public/logo.jpg'/>
            <button @click='mode = "data"' class='btn btn--stroke btn--s btn--gray round mr12'>Data</button>
            <button @click='mode = "runs"' class='btn btn--stroke btn--s btn--gray round mr12'>Runs</button>
            <button @click='mode = "jobs"' class='btn btn--stroke btn--s btn--gray round mr12'>Jobs</button>

            <span class='fr'>OpenAddresses Data</span>
        </div>

        <div class='col col--12 flex-parent flex-parent--center-main'>
            <div class='flex-child wmax600 col col--12'>
                <template v-if='mode === "data"'>
                    <Data/>
                </template>
                <template v-else-if='mode === "runs"'>
                    <Runs/>
                </template>
                <template v-else-if='mode === "jobs"'>
                    <Jobs
                        v-on:log='emitlog($event)'
                        v-on:job='emitjob($event)'
                    />
                </template>
                <template v-else-if='mode === "log"'>
                    <Log
                        :jobid='jobid'
                        v-on:close='mode = "job"'
                    />
                </template>
                <template v-else-if='mode === "job"'>
                    <Job
                        :jobid='jobid'
                        v-on:close='mode = "jobs"'
                        v-on:log='emitlog($event)'
                    />
                </template>
            </div>
        </div>
    </div>
</template>

<script>
import Data from './components/Data.vue';
import Runs from './components/Runs.vue';
import Jobs from './components/Jobs.vue';
import Job from './components/Job.vue';
import Log from './components/Log.vue';

export default {
    name: 'OpenAddresses',
    data: function() {
        return {
            mode: false,
            jobid: false
        };
    },
    mounted: function() {
        const mode = window.location.hash.replace('#', '').split(':');
        if (mode.length && ['data', 'runs', 'jobs'].includes(mode[0])) {

            if (mode[0] === 'jobs') {
                if (mode.length >= 2) {
                    this.jobid = parseInt(mode[1]);

                    if (mode.length >= 3) {
                        this.mode = 'log'
                    } else {
                        this.mode = 'job';
                    }
                } else {
                    this.mode = 'jobs';
                }
            } else if (mode[0] === 'runs') {
                this.mode = 'runs';
            } else if (mode[0] === 'data') {
                this.mode = 'data';
            } else {
                this.mode = 'data';
            }
        }
    },
    watch: {
        mode: function() {
            if (!['log', 'job'].includes(this.mode)) {
                this.jobid = false;
            }
        }
    },
    methods: {
        external: function(url) {
            window.location.href = url;
        },
        emitlog: function(jobid) {
            this.jobid = jobid;
            this.mode = 'log';
        },
        emitjob: function(jobid) {
            this.jobid = jobid;
            this.mode = 'job';
        }
    },
    components: {
        Data,
        Runs,
        Jobs,
        Log,
        Job
    }
}
</script>
