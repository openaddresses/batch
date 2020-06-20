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
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else-if='!problems.length'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Errors Found</div>
            <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
        </template>
        <template v-else>
            <div :key='job.id' v-for='job in problems' class='col col--12 grid'>
                <div @click='emitjob(job.id)' class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--1'>
                        <Status :status='job.status'/>
                    </div>
                </div>
            </div>

        </template>
    </div>
</template>

<script>
import Status from './Status.vue';

export default {
    name: 'Errors',
    props: [ ],
    data: function() {
        return {
            loading: false,
            problems: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    components: {
        Status
    },
    methods: {
        refresh: function() {
            this.getProblems();
        },
        getProblems: function() {
            const url = new URL(`${window.location.origin}/api/job/errors`);

            fetch(url, {
                method: 'GET'
            }).then((res) => {
                if (res.status === 404) {
                    this.problems = [];
                } else if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get error sources');
                }

                return res.json();
            }).then((res) => {
                this.problems = res;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
