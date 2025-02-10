<template>
    <div class='page page-center'>
        <div class='container container-normal py-4'>
            <div class='row align-items-center g-4'>
                <div class='col-lg'>
                    <div class='container-tight'>
                        <div class='card card-md'>
                            <TablerLoading
                                v-if='loading.page'
                                desc='Creating User'
                            />
                            <div
                                v-else-if='success'
                                class='card-body'
                            >
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
                                    Successfully Registered!
                                </h2>
                                <div class='text-center'>
                                    <p class='txt-h4 py6'>
                                        Please check your email for a verification link!
                                    </p>
                                </div>

                                <TablerLoading
                                    v-if='loading.resend'
                                    desc='Sending Email'
                                />
                                <button
                                    v-if='!loading.resend'
                                    :disabled='resent'
                                    class='btn w-full'
                                    @click='resend'
                                >
                                    <template v-if='!resent'>
                                        Resend Email
                                    </template>
                                    <template v-else-if='resent'>
                                        Email Resent
                                    </template>
                                </button>

                                <button
                                    v-if='!loading.resend'
                                    class='btn btn-primary w-full mt-4'
                                    @click='$router.push("/login")'
                                >
                                    Login
                                </button>
                            </div>
                            <div
                                v-else
                                class='card-body'
                            >
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
                                    Create An Account
                                </h2>

                                <TablerInput
                                    v-model='body.username'
                                    label='Username'
                                    :error='errors.username'
                                    class='my-2'
                                />
                                <TablerInput
                                    v-model='body.email'
                                    label='Email'
                                    :error='errors.email'
                                    class='my-2'
                                />
                                <TablerInput
                                    v-model='body.password'
                                    type='password'
                                    label='Password'
                                    :error='errors.password'
                                    class='my-2'
                                />

                                <button
                                    type='submit'
                                    class='btn btn-primary w-100 mt-4'
                                    @click='register'
                                >
                                    Register
                                </button>
                            </div>
                        </div>
                        <div class='text-center text-muted mt-3'>
                            Have an account already? <a
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
    name: 'Register',
    components: {
        TablerLoading,
        TablerInput
    },
    props: [],
    data: function() {
        return {
            success: false,
            resent: false,
            attempted: false,
            loading: {
                page: false,
                resend: false
            },
            body: {
                email: '',
                username: '',
                password: ''
            },
            errors: {
                email: '',
                username: '',
                password: ''
            }
        }
    },
    methods: {
        login: function() {
            this.$router.push('/login');
        },
        resend: async function() {
            if (!this.success) return;
            if (!this.body.username.length) return;

            this.loading.resend = true;

            await window.std('/api/user', {
                method: 'POST',
                body: {
                    username: this.body.username,
                }
            });

            this.resent = true;

            this.loading.resend = false;
        },
        register: async function() {
            this.attempted = true;

            for (const field of ['username', 'email', 'password']) {
                if (!this.body[field]) this.errors[field] = 'Cannot be empty';
                else this.errors[field] = '';
            }

            for (const e in this.errors) if (this.errors[e]) return;

            this.loading.page = true;

            try {
                this.created = await window.std('/api/user', {
                    method: 'POST', body: this.body
                });

                this.success = true;
            } catch (err) {
                this.loading.page = false;
                throw err;
            }

            this.loading.page = false;
        }
    }
}
</script>
