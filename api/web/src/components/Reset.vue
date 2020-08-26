<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-if='reset'>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Reset Login</h3>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='flex-child py6'>Your password has been reset</div>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <button @click='$router.push({ path: "/data" })' class='btn btn--stroke round my12'>Login</button>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Reset Login</h3>
            </div>

            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='w240 col col--12 grid grid--gut12'>
                    <label class='mt12 w-full'>Reset Token</label>
                    <input v-on:keyup.enter='forgot' :class='{
                         "input--border-red": attempted && !token
                    }' v-model='token' type='text' class='input'/>

                    <label class='mt12 w-full'>New Password</label>
                    <input v-on:keyup.enter='forgot' :class='{
                         "input--border-red": attempted && !password
                    }' v-model='password' type='password' class='input'/>

                    <button @click='forgot' class='mt12 w-full color-gray color-green-on-hover btn btn--stroke round'>Reset</button>
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
        forgot: function() {
            this.attempted = true;

            if (!this.password.length) return;
            if (!this.token.length) return;
            this.loading = true;

            fetch(window.location.origin + `/api/login/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    token: this.token,
                    password: this.password
                })
            }).then((res) => {
                this.loading = false;
                if (!res.ok) throw new Error('Failed to reset password');
                this.reset = true;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
