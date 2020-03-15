<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--2'>
                Status
            </div>
            <div class='col col--4'>
                Job ID
            </div>
            <div class='col col--6'>
                Attributes
            </div>
        </div>

        <div :key='job.id' v-for='job in jobs' class='col col--12 grid'>
            <div class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                <div class='col col--2 flex-parent flex-parent--center-main'>
                    <template v-if='job.status === "Pending"'>
                        <button class='flex-child btn btn--stroke round btn--gray color--yellow'><svg class='icon'><use xlink:href='#icon-circle'/></svg></button>
                    </template>
                    <template v-else-if='job.status === "Success"'>
                        <button class='flex-child btn btn--stroke round'><svg class='icon'><use xlink:href='#icon-circle'/></svg></button>
                    </template>
                    <template v-else-if='job.status === "Fail"'>
                        <button class='flex-child btn btn--stroke round'><svg class='icon'><use xlink:href='#icon-circle'/></svg></button>
                    </template>
                </div>
                <div class='col col--4'>
                    Job <span v-text='job.id'/>
                </div>
                <div class='col col--6 pr12'>
                    <span v-if='job.loglink' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Logs</span>
                    <span v-if='job.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Data</span>
                </div>
            </div>
            <template v-if='job.expand'>
                <Job/>
            </template>
        </div>
    </div>
</template>

<script>
import Job from './Job.vue';

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
                this.jobs = res.map((r) => {
                    r.expand = false;
                    return r;
                });
            });
        }
    },
    components: {
        Job
    }
}
</script>
