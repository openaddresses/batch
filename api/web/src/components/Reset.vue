<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading' />
            </div>
        </template>
        <template v-if='reset'>
            <div class='col col--12 flex flex--center-main'>
                <h3 class='txt-h4 py6'>
                    Reset Login
                </h3>
            </div>
            <div class='col col--12 flex flex--center-main'>
                <div class='py6'>
                    Your password has been reset
                </div>
            </div>
            <div class='col col--12 flex flex--center-main'>
                <button
                    class='btn btn--stroke round my12'
                    @click='$router.push({ path: "/data" })'
                >
                    Login
                </button>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex flex--center-main'>
                <h3 class='txt-h4 py6'>
                    Reset Login
                </h3>
            </div>

            <div class='col col--12 flex flex--center-main'>
                <div class='w240 col col--12 grid grid--gut12'>
                    <label class='mt12 w-full'>Reset Token</label>
                    <input
                        v-model='token'
                        :class='{
                            "input--border-red": attempted && !token
                        }'
                        type='text'
                        class='input'
                        @keyup.enter='forgot'
                    >

                    <label class='mt12 w-full'>New Password</label>
                    <input
                        v-model='password'
                        :class='{
                            "input--border-red": attempted && !password
                        }'
                        type='password'
                        class='input'
                        @keyup.enter='forgot'
                    >

                    <button
                        class='mt12 w-full color-gray color-green-on-hover btn btn--stroke round'
                        @click='forgot'
                    >
                        Reset
                    </button>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Forgot',
    props: [],
    data: function() {
        return {
            loading: false,
            attempted: false,
            token: '',
            password: '',
            reset: false
        }
    },
    mounted: function() {
       if (this.$route.query.token) this.token = this.$route.query.token;
    },
    methods: {
        forgot: async function() {
            this.attempted = true;

            if (!this.password.length) return;
            if (!this.token.length) return;
            this.loading = true;

            await window.std('/api/login/reset', {
                method: 'POST',
                body: {
                    token: this.token,
                    password: this.password
                }
            });

            this.loading = false;
            this.reset = true;
        }
    }
}
</script>
