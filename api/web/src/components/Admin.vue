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
                    <div class='col col--5'>
                        <span class='ml12' v-text='job.source'/>
                    </div>
                    <div class='col col--2'>
                        <span v-text='job.created.match(/\d{4}-\d{2}-\d{2}/)[0]'/>
                    </div>
                    <div class='col col--5'>
                        <span v-on:click.stop.prevent='datapls(job)' v-if='job.output.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Download</span>
                        <span v-on:click.stop.prevent='emithistory(job)' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>History</span>
                    </div>
                </div>
            </div>

        </template>
    </div>
</template>

<script>
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
    methods: {
        refresh: function() {
            this.getProblems();
        },
        getProblems: function() {
            const url = new URL(`${window.location.origin}/api/job`);

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
