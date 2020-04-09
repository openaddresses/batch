<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Register</h3>
            </div>

            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='w240 col col--12 grid grid--gut12'>
                    <label class='mt12'>Username:</label>
                    <input v-model='username' type='text' class='input'/>

                    <label class='mt12'>Email:</label>
                    <input v-model='email' type='text' class='input'/>

                    <label class='mt12'>Password:</label>
                    <input v-model='password' type='password' class='input'/>

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
            loading: false,
            email: '',
            username: '',
            password: ''
        }
    },
    methods: {
        register: function() {
            this.loading = true;

            fetch(window.location.origin + `/api/user`, {
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
            }).then(() => {
                this.loading = false;
            });
        }
    }
}
</script>
