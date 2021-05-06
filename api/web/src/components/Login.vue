<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex flex--center-main w-full'>
                <div class='loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex flex--center-main'>
                <h3 class='txt-h4 py6'>Login</h3>
            </div>

            <div class='col col--12 flex flex--center-main'>
                <div class='w240 col col--12 grid grid--gut12'>
                    <label class='mt12 w-full'>Username: <span @click='$router.push({ path: "/login/forgot" })' class='fr cursor-pointer txt-underline-on-hover'>Forgot it?</span></label>
                    <input v-on:keyup.enter='login' :class='{
                         "input--border-red": attempted && !username
                    }' v-model='username' type='text' class='input'/>

                    <label class='mt12 w-full'>Password: <span @click='$router.push({ path: "/login/forgot" })' class='fr cursor-pointer txt-underline-on-hover'>Forgot it?</span></label>
                    <input v-on:keyup.enter='login' :class='{
                         "input--border-red": attempted && !password
                   } ' v-model='password' type='password' class='input'/>

                    <button @click='login' class='mt12 w-full color-gray color-green-on-hover btn btn--stroke round'>Login</button>

                    <div @click='$router.push({ path: "/register" })' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>No account? Register!</div>
                </div>
            </div>

        </template>
    </div>
</template>

<script>
export default {
    name: 'Login',
    props: [],
    data: function() {
        return {
            loading: false,
            attempted: false,
            username: '',
            password: ''
        }
    },
    methods: {
        login: async function() {
            try {
                this.attempted = true;

                if (!this.username.length) return;
                if (!this.password.length) return;
                this.loading = true;

                await window.std('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        username: this.username,
                        password: this.password
                    })
                });

                this.loading = false;

                this.$emit('auth');
                this.$router.push('/data')
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
