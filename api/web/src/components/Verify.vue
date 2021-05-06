<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Email Verified!</h3>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='flex-child py6'>Thanks for confirming your email</div>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <button @click='$router.push({ path: "/login" })' class='btn btn--stroke round my12'>Login</button>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Verify',
    props: [],
    data: function() {
        return {
            loading: true
        }
    },
    mounted: function() {
        this.verify();
    },
    methods: {
        verify: async function() {
            try {
                await window.std(`/api/login/verify?token=${this.$route.query.token}`, {
                    method: 'GET',
                    credentials: 'same-origin'
                });
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
