<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else>
            <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
            </button>

            <h1 class='txt-h4 pl12' v-text='location.name'></h1>

            <div class='col col--12 pt12'>
                <Coverage
                    @err='$emit("err", $event)'
                    :filter='locid'
                    :bbox='location.bbox'
                />
            </div>
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
            location: {},
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
                this.location = await window.std(window.location.origin + `/api/map/${this.locid}`);
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
