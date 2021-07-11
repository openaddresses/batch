<template>
    <div class='col col--12 grid pt12'>
        <Coverage
            @err='$emit("err", $event)'
            :filter='locid'
        />
    </div>
</template>

<script>
//import Download from './Download.vue';
import Coverage from './Coverage.vue';

export default {
    name: 'Location',
    props: [ 'auth', 'locid' ],
    mounted: function() {
        this.refresh();
    },
    data: function() {
        return {
            jobs: [],
            loading: false
        };
    },
    components: {
        //Download,
        Coverage
    },
    methods: {
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` });
        },
        refresh: function() {
            this.getJobs();
        },
        getJobs: async function() {
            try {
                this.loading = true;
                this.jobs = await window.std(window.location.origin + '/api/job');
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
