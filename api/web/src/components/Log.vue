<template>
    <div class='col col--12'>
        <div @click='linenum(line)' v-for='line in lines' :key='line.id' v-text='line.message' class='cursor-pointer bg-darken10-on-hover'></div>
    </div>
</template>

<script>
export default {
    name: 'Log',
    props: ['jobid'],
    data: function() {
        return {
            lines: []
        };
    },
    mounted: function() {
        window.location.hash = `jobs:${this.jobid}:log`
        this.refresh();
    },
    methods: {
        refresh: function() {
            this.getLog();
        },
        getLog: function() {
            fetch(`${window.location.origin}/api/job/${this.jobid}/log`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.lines = res;
            });
        },
        linenum: function(line) {
            window.location.hash = `jobs:${this.jobid}:log:${line.id}`
        }
    }
}
</script>
