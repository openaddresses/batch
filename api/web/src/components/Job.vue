<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <button @click='close' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>
                <h2 class='txt-h4 ml12 pb12 fl'>Job #<span v-text='jobid'/></h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>

                <span @click='external(job.source)' v-if='job.source' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Source</span>
                <span @click='emitlog(job.id)' v-if='job.loglink' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Logs</span>
                <span v-if='job.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Data</span>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>

        </template>
    </div>
</template>

<script>
export default {
    name: 'Job',
    props: ['jobid'],
    data: function() {
        return {
            loading: false,
            job: {}
        };
    },
    mounted: function() {
        window.location.hash = `jobs:${this.jobid}`

        this.refresh();
    },
    methods: {
        close: function() {
            this.$emit('close');
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        emitlog: function(jobid) {
            this.$emit('log', jobid);
        },
        emitjob: function(jobid) {
            this.$emit('job', jobid);
        },
        refresh: function() {
            this.getJob();
        },
        getJob: function() {
            this.loading = true;
            fetch(window.location.origin + `/api/job/${this.jobid}`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.job = res;
                this.loading = false;
            });
        }
    }
}
</script>
