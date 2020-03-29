<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Login</h3>
            </div>

            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='w240 col col--12 grid grid--gut12'>
                    <label class='mt12'>Username:</label>
                    <input type='text' class='input'/>

                    <label class='mt12'>Password:</label>
                    <input type='password' class='input'/>

                    <button @click='login' class='mt12 w-full color-gray color-green-on-hover btn btn--stroke round'>Login</button>
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
            username: '',
            password: ''
        }
    },
    mounted: function() {
        window.location.hash = `login`
    },
    methods: {
        login: function() {
            this.loading = true;

            fetch(window.location.origin + `/api/login`, {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    username: this.username,
                    password: this.password
                })
            }).then(() => {
                this.loading = false;
            });
        }
    }
}
</script>
