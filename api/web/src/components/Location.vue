<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else>
            <h1 v-text='location'></h1>

            <Coverage
                @err='$emit("err", $event)'
                :filter='locid'
            />
        </template>
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
            location: '',
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
