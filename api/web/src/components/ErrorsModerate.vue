<template>
    <div class='flex-child'>
        <template v-if='job.status === "Warn"'>
            <button v-on:click.stop.prevent='mod(job.id, true)' class='fr mr6 btn btn--s btn--stroke round btn--gray color-green-on-hover'>Confirm</button>
            <button v-on:click.stop.prevent='mod(job.id, false)' class='fr mr6 btn btn--s btn--stroke round btn--gray color-red-on-hover'>Reject</button>
        </template>
        <template v-else-if='job.status === "Fail"'>
            <button v-on:click.stop.prevent='mod(job.id, false)' class='fr mr6 btn btn--s btn--stroke round btn--gray color-red-on-hover'>Suppress</button>
            <button v-on:click.stop.prevent='createRerun(job.id)' class='fr mr6 btn btn--s btn--stroke round btn--gray color-blue-on-hover'>Rerun</button>
        </template>
        <button v-on:click.stop.prevent='$router.push({ path: `/job/${job.id}/log` })' class='fr mr6 btn btn--s btn--stroke round btn--gray color-blue-on-hover'>Logs</button>
    </div>
</template>

<script>
export default {
    name: 'ErrorsModerate',
    props: [ 'job' ],
    data: function() {
        return {};
    },
    methods: {
        refresh: function() {
            this.getProblems();
        },
        mod: function(job_id, confirm) {
            const url = new URL(`${window.location.origin}/api/job/error/${job_id}`);

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    moderate: confirm ? 'confirm' : 'reject'
                })
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get update job error');
                }

                this.$emit('moderated');
            }).catch((err) => {
                this.$emit('err', err);
            });
        },
        createRerun: function(job_id) {
            this.loading = true;

            this.mod(job_id, false)

            fetch(window.location.origin + `/api/job/${job_id}/rerun`, {
                method: 'POST'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to rerun job');
                }

                return res.json();
            }).then((res) => {
                this.$router.push({ path: `/run/${res.run}` });
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
