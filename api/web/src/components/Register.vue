<template>
<div class="page page-center">
    <div class="container container-normal py-4">
        <div class="row align-items-center g-4">
            <div class="col-lg">
                <div class="container-tight">
                    <div class="card card-md">
                        <TablerLoading v-if='loading.page' desc='Creating User'/>
                        <div v-else-if='success' class='card-body'>
                            <div class='text-center' style='margin-bottom: 24px;'>
                                <img src='/logo.jpg' height='150'/>
                            </div>

                            <h2 class="h2 text-center mb-4">Successfully Registered!</h2>
                            <div class='text-center'>
                                <p class='txt-h4 py6'>Please check your email for a verification link!</p>
                            </div>

                            <button :disabled='loading.resend || resent' @click='resend' class='mt12 w-full color-gray color-green-on-hover btn btn--stroke round'>
                                <template v-if='!loading.resend'>
                                    Resend Email
                                </template>
                                <template v-else-if='resent'>
                                    Email Resent
                                </template>
                                <template v-else>
                                    <div class='col col--12 flex flex--center-main'>
                                        <div class='loading loading--s'></div>
                                    </div>
                                </template>
                            </button>

                            <button @click='$router.push("/login")' class='btn btn-primary w-full mt-4'>Login</button>
                        </div>
                        <div v-else class="card-body">
                            <div class='text-center' style='margin-bottom: 24px;'>
                                <img src='/logo.jpg' height='150'/>
                            </div>

                            <h2 class="h2 text-center mb-4">Create An Account</h2>

                            <TablerInput label='Username' v-model='body.username' :error='errors.username' class='my-2'/>
                            <TablerInput label='Email' v-model='body.email' :error='errors.email' class='my-2'/>
                            <TablerInput type='password' label='Password' v-model='body.password' :error='errors.password' class='my-2'/>

                          <button @click='register' type="submit" class="btn btn-primary w-100 mt-4">Register</button>
                        </div>
                    </div>
                    <div class="text-center text-muted mt-3">
                        Have an account already? <a @click='$router.push("/login")' class='cursor-pointer'>Login</a>
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
    },
    components: {
        TablerLoading,
        TablerInput
    }
}
</script>
