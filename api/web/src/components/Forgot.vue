<template>
    <div class='col col--12 grid pt12'>
        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else-if='reset'>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Reset Login</h3>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='flex-child py6'>A password reset email has been sent</div>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='flex-child py6'>(If a user account exists)</div>
            </div>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <button @click='$router.push({ path: "/data" })' class='btn btn--stroke round my12'>Thanks</button>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 flex-parent flex-parent--center-main'>
                <h3 class='flex-child txt-h4 py6'>Reset Login</h3>
            </div>

            <div class='col col--12 flex-parent flex-parent--center-main'>
                <div class='w240 col col--12 grid grid--gut12'>
                    <label class='mt12 w-full'>Username or Email:</label>
                    <input v-on:keyup.enter='forgot' :class='{
                         "input--border-red": attempted && !user
                    }' v-model='user' type='text' class='input'/>

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
            user: '',
            reset: false
        }
    },
    methods: {
        forgot: async function() {
            try {
                this.attempted = true;

                if (!this.user.length) return;
                this.loading = true;

                await window.std('/api/login/forgot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        user: this.user
                    })
                });

                this.loading = false;
                this.reset = true;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
