<template>
    <div class='col col--12 grid'>
        <div class='col col--12 grid'>
            <div class='col col--1'>
                Status
            </div>
            <div class='col col--3'>
                Job ID
            </div>
        </div>

        <div :key='job.id' v-for='job in jobs' class='col col--12 grid'>
            <div class='col col--1'>
                <template v-if='job.status === "Pending"'>
                    <button class='btn btn--stroke round btn--gray color--yellow'><svg class='icon'><use xlink:href='#icon-circle'/></svg></button>
                </template>
                <template v-else-if='job.status === "Success"'>
                    <button class='btn btn--stroke round'><svg class='icon'><use xlink:href='#icon-circle'/></svg></button>
                </template>
                <template v-else-if='job.status === "Fail"'>
                    <button class='btn btn--stroke round'><svg class='icon'><use xlink:href='#icon-circle'/></svg></button>
                </template>
            </div>
            <div class='col col--3'>Job <span v-text='job.id'/></div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Jobs',
    mounted: function() {
        window.location.hash = 'jobs';
        this.getJobs();
    },
    data: function() {
        return {
            jobs: []
        };
    },
    methods: {
        getJobs: function() {
            fetch(window.location.origin + '/api/job', {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.jobs = res;
            });
        }
    }
}
</script>
