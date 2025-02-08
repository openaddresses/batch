<template>
    <div class='page page-center'>
        <div class='container container-normal py-4'>
            <div class='row align-items-center g-4'>
                <div class='col-lg'>
                    <div class='container-tight'>
                        <div class='card card-md'>
                            <div class='card-body'>
                                <div
                                    class='text-center'
                                    style='margin-bottom: 24px;'
                                >
                                    <img
                                        src='/logo.jpg'
                                        height='150'
                                    >
                                </div>
                                <h2 class='h2 text-center mb-4'>
                                    Reset Password
                                </h2>

                                <TablerLoading
                                    v-if='loading'
                                    desc='Sending Reset Email'
                                />
                                <template v-else-if='reset'>
                                    <div class='text-center'>
                                        A password reset email has been sent
                                    </div>
                                    <div class='text-center py-2'>
                                        (If a user account exists)
                                    </div>

                                    <button
                                        class='btn btn-primary w-100 mt-4'
                                        @click='$router.push({ path: "/data" })'
                                    >
                                        Home
                                    </button>
                                </template>
                                <template v-else>
                                    <div class='mb-3'>
                                        <label class='form-label'>Username or Email</label>
                                        <input
                                            v-model='user'
                                            type='text'
                                            class='form-control'
                                            placeholder='your@email.com'
                                            autocomplete='off'
                                            @keyup.enter='forgot'
                                        >
                                    </div>
                                    <button
                                        type='submit'
                                        class='btn btn-primary w-100'
                                        @click='forgot'
                                    >
                                        Reset Login
                                    </button>
                                </template>
                            </div>
                        </div>
                        <div class='text-center text-muted mt-3'>
                            Don't have account yet? <a
                                class='cursor-pointer'
                                @click='$router.push("/register")'
                            >Create Account</a> or <a
                                class='cursor-pointer'
                                @click='$router.push("/login")'
                            >Login</a>
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
    components: {
        TablerLoading,
        TablerInput
    },
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
    }
}
</script>
