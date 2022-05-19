<template>
    <div class='flex-child'>
        <template v-if='error.status === "Warn"'>
            <button v-on:click.stop.prevent='mod(error.id, true)' class='fr mr6 btn btn--s btn--stroke round btn--gray color-green-on-hover'>Confirm</button>
            <button v-on:click.stop.prevent='mod(error.id, false)' class='fr mr6 btn btn--s btn--stroke round btn--gray color-red-on-hover'>Reject</button>
        </template>
        <template v-else-if='error.status === "Fail"'>
            <button v-on:click.stop.prevent='mod(error.id, false)' class='fr mr6 btn btn--s btn--stroke round btn--gray color-red-on-hover'>Suppress</button>
            <button v-on:click.stop.prevent='createRerun(error.id)' class='fr mr6 btn btn--s btn--stroke round btn--gray color-blue-on-hover'>Rerun</button>
        </template>
        <button v-on:click.stop.prevent='$router.push({ path: `/job/${error.job}/log` })' class='fr mr6 btn btn--s btn--stroke round btn--gray color-blue-on-hover'>Logs</button>
    </div>
</template>

<script>
export default {
    name: 'ErrorsModerate',
    props: [ 'error' ],
    data: function() {
        return {};
    },
    methods: {
        refresh: function() {
            this.getProblems();
        },
        mod: async function(job_id, confirm) {
            try {
                await window.std(`/api/job/error/${job_id}`, {
                    method: 'POST',
                    body: {
                        moderate: confirm ? 'confirm' : 'reject'
                    }
                });

                this.$emit('moderated');
            } catch (err) {
                this.$emit('err', err);
            }
        },
        createRerun: async function(job_id) {
            try {
                this.loading = true;

                this.mod(job_id, false)

                const res = await window.std(`/api/job/${job_id}/rerun`, {
                    method: 'POST'
                });

                this.$router.push({ path: `/run/${res.run}` });
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
