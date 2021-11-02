<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex flex--center-main'>
                <h3 class='txt-h4 py6'>Email Verified!</h3>
            </div>
            <div class='col col--12 flex flex--center-main'>
                <div class='py6'>Thanks for confirming your email</div>
            </div>
            <div class='col col--12 flex flex--center-main'>
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
            this.loading = true;
            try {
                await window.std(`/api/login/verify?token=${this.$route.query.token}`, {}, false);
            } catch(err) {
                this.$emit('err', err);
            }
            this.loading = false;
        }
    }
}
</script>
