<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 pb12 fl'>Job #<span v-text='jobid'/></h2>

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
