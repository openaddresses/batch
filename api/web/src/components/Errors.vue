<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>Source Errors:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>
        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else-if='!problems.length'>
            <div class='flex flex--center-main w-full'>
                <div class='py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Errors Found</div>
            <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
        </template>
        <template v-else>
            <div @click='$router.push({ path: `/job/${job.id}` })' :key='job.id' v-for='(job, i) in problems' class='col col--12 grid'>
                <div class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--1'>
                        <Status :status='job.status'/>
                    </div>
                    <div class='col col--1'>
                        Job <span v-text='job.id'/>
                    </div>
                    <div class='col col--6'>
                        <span v-text='`${job.source_name} - ${job.layer} - ${job.name}`'/>
                    </div>
                    <div class='col col--4'>
                        <ErrorsModerate :job='job' @moderated="problems.splice(i, 1)"/>
                    </div>

                    <div class='col col--12 py3'>
                        <div :key='message' v-for='message in job.messages' class='align-center w-full' v-text='message'></div>
                    </div>
                </div>
            </div>

        </template>
    </div>
</template>

<script>
import Status from './Status.vue';
import ErrorsModerate from './ErrorsModerate.vue';

export default {
    name: 'Errors',
    props: [ ],
    data: function() {
        return {
            loading: true,
            problems: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    components: {
        Status,
        ErrorsModerate
    },
    watch: {
        problems: function() {
            this.$emit('errors', this.problems.length);
        }
    },
    methods: {
        refresh: function() {
            this.getProblems();
        },
        getProblems: async function() {
            try {
                this.loading = true;
                this.problems = await window.std('/api/job/error');
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
        external: function(url) {
            window.open(url, "_blank");
        }
    }
}
</script>
