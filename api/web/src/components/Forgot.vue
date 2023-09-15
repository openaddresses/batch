<template>
<div class="page page-center">
    <div class="container container-normal py-4">
        <div class="row align-items-center g-4">
            <div class="col-lg">
                <div class="container-tight">
                    <div class="card card-md">
                        <div class="card-body">
                            <div class='text-center' style='margin-bottom: 24px;'>
                                <img src='/logo.jpg' height='150'/>
                            </div>
                            <h2 class="h2 text-center mb-4">Reset Password</h2>

                            <TablerLoading v-if='loading' desc='Sending Reset Email'/>
                            <template v-else-if='reset'>
                                <div class='text-center'>
                                    A password reset email has been sent
                                </div>
                                <div class='text-center py-2'>
                                    (If a user account exists)
                                </div>

                                <button @click='$router.push({ path: "/data" })' class='btn btn-primary w-100 mt-4'>Home</button>
                            </template>
                            <template v-else>
                                <div class="mb-3">
                                    <label class="form-label">Username or Email</label>
                                    <input v-model='user' v-on:keyup.enter='forgot' type="text" class="form-control" placeholder="your@email.com" autocomplete="off">
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
            user: '',
            reset: false
        }
    },
    methods: {
        forgot: async function() {
            this.loading = true;

            await window.std('/api/login/forgot', {
                method: 'POST',
                body: {
                    user: this.user
                }
            });

            this.loading = false;
            this.reset = true;
        }
    },
    components: {
        TablerLoading,
        TablerInput
    }
}
</script>
