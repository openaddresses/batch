<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>Administration:</h2>

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
    name: 'Admin',
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
            const url = new URL(`${window.location.origin}/api/data/history`);
            url.searchParams.set('status', ['Warn', 'Fail']);

            fetch(url, {
                method: 'Get'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.problems = res;
            });
        }
    }
}
</script>
