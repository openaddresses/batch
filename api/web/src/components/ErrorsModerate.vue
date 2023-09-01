<template>
<div class='btn-list'>
    <template v-if='error.status === "Warn"'>
        <button v-on:click.stop.prevent='mod(error.id, true)' class='btn'>Confirm</button>
        <button v-on:click.stop.prevent='mod(error.id, false)' class='btn'>Reject</button>
    </template>
    <template v-else-if='error.status === "Fail"'>
        <button v-on:click.stop.prevent='mod(error.id, false)' class='btn'>Suppress</button>
        <button v-on:click.stop.prevent='createRerun(error.id)' class='btn'>Rerun</button>
    </template>
    <button v-on:click.stop.prevent='$router.push({ path: `/job/${error.job}/log` })' class='btn'>Logs</button>
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
