<template>
<div class="page page-center">
    <div class="container container-normal py-4">
        <div class="row align-items-center g-4">
            <div class="col-lg">
                <div class="container-tight">
                    <div class="card card-md">
                        <div class="card-body">
                            <template v-if='reset'>
                                <div class='col col--12 flex flex--center-main'>
                                    <h3 class='txt-h4 py6'>Reset Login</h3>
                                </div>
                                <div class='col col--12 flex flex--center-main'>
                                    <div class='py6'>A password reset email has been sent</div>
                                </div>
                                <div class='col col--12 flex flex--center-main'>
                                    <div class='py6'>(If a user account exists)</div>
                                </div>
                                <div class='col col--12 flex flex--center-main'>
                                    <button @click='$router.push({ path: "/data" })' class='btn btn--stroke round my12'>Thanks</button>
                                </div>
                            </template>
                            <template v-else>
                                <div class='text-center' style='margin-bottom: 24px;'>
                                    <img src='/logo.jpg' height='150'/>
                                </div>
                                <h2 class="h2 text-center mb-4">Reset Password</h2>
                                <div class="mb-3">
                                    <label class="form-label">Username or Email</label>
                                    <input v-model='username' v-on:keyup.enter='createLogin' type="text" class="form-control" placeholder="your@email.com" autocomplete="off">
                                </div>
                                <button @click='forgot' type="submit" class="btn btn-primary w-100">Reset Login</button>
                            </template>
                        </div>
                    </div>
                    <div class="text-center text-muted mt-3">
                        Don't have account yet? <a @click='$router.push("/register")' class='cursor-pointer'>Create Account</a> or <a @click='$router.push("/login")' class='cursor-pointer'>Login</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import {
    TablerLoading,
    TablerInput
} from '@tak-ps/vue-tabler';

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
                    body: {
                        user: this.user
                    }
                });

                this.loading = false;
                this.reset = true;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        TablerLoading,
        TablerInput
    }
}
</script>
