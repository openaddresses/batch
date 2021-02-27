<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else-if='success'>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Successfully Registered!</h3>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <p class='flex-child txt-h4 py6'>Please check your email for a verification link!</p>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='w240 col col--12 grid grid--gut12'>
                    <button @click='login' class='mt12 w-full color-gray color-green-on-hover btn btn--stroke round'>Login</button>
                </div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Register</h3>
            </div>

            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='w240 col col--12 grid grid--gut12'>
                    <label class='mt12'>Username:</label>
                    <input :class='{
                        "input--border-red": attempted && !username
                    }' v-model='username' type='text' class='input'/>

                    <label class='mt12'>Email:</label>
                    <input :class='{
                        "input--border-red": attempted && !email
                    }' v-model='email' type='text' class='input'/>

                    <label class='mt12'>Password:</label>
                    <input :class='{
                        "input--border-red": attempted && !password
                    }' v-model='password' type='password' class='input'/>

                    <button @click='register' class='mt12 w-full color-gray color-green-on-hover btn btn--stroke round'>Register</button>
                </div>
            </div>

        </template>
    </div>
</template>

<script>
export default {
    name: 'Register',
    props: [],
    data: function() {
        return {
            success: false,
            attempted: false,
            loading: false,
            email: '',
            username: '',
            password: ''
        }
    },
    methods: {
        login: function() {
            this.$router.push('/login');
        },
        register: async function() {
            this.attempted = true;

            if (!this.username.length) return;
            if (!this.password.length) return;
            if (!this.email.length) return;
            this.loading = true;

            let res;
            try {
                res = await fetch(window.location.origin + `/api/user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        username: this.username,
                        email: this.email,
                        password: this.password
                    })
                });
            } catch(err) {
                return this.$emit('err', err);
            }

            this.loading = false;

            try {
                const body = await res.json();

                if (!res.ok && body.message) {
                    throw new Error(body.message);
                } else if (!res.ok) {
                    throw new Error('Failed to register user');
                }

            } catch (err) {
                return this.$emit('err', err);
            }

            this.success = true;
        }
    }
}
</script>
