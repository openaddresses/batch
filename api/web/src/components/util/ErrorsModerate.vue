<template>
    <div class='btn-list'>
        <template v-if='error.status === "Warn"'>
            <button
                class='btn'
                @click.stop.prevent='mod(error.job || error.id, true)'
            >
                Confirm
            </button>
            <button
                class='btn btn-danger'
                @click.stop.prevent='mod(error.job || error.id, false)'
            >
                Reject
            </button>
            <button
                class='btn'
                @click.stop.prevent='$router.push({ path: `/job/${error.job || error.id}/log` })'
            >
                Logs
            </button>
        </template>
        <template v-else-if='error.status === "Fail"'>
            <button
                class='btn'
                @click.stop.prevent='$router.push({ path: `/job/${error.job || error.id}/log` })'
            >
                Logs
            </button>
            <button
                class='btn btn-secondary'
                @click.stop.prevent='createRerun(error.job || error.id)'
            >
                Rerun
            </button>
            <button
                class='btn btn-primary'
                @click.stop.prevent='mod(error.job || error.id, false)'
            >
                Suppress
            </button>
        </template>
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
