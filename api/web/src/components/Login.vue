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
                                    Login to your account
                                </h2>
                                <div class='mb-3'>
                                    <label class='form-label'>Username or Email</label>
                                    <input
                                        v-model='username'
                                        type='text'
                                        class='form-control'
                                        placeholder='your@email.com'
                                        autocomplete='off'
                                        @keyup.enter='createLogin'
                                    >
                                </div>
                                <div class='mb-2'>
                                    <label class='form-label'>
                                        Password
                                        <span class='form-label-description'>
                                            <a
                                                class='cursor-pointer'
                                                @click='$router.push("/login/forgot")'
                                            >Forgot Password</a>
                                        </span>
                                    </label>
                                    <div class='input-group input-group-flat'>
                                        <input
                                            v-model='password'
                                            type='password'
                                            class='form-control'
                                            placeholder='Your password'
                                            autocomplete='off'
                                            @keyup.enter='createLogin'
                                        >
                                    </div>
                                </div>
                                <div class='form-footer'>
                                    <button
                                        type='submit'
                                        class='btn btn-primary w-100'
                                        @click='createLogin'
                                    >
                                        Sign In
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class='text-center text-muted mt-3'>
                            Don't have account yet? <a
                                class='cursor-pointer'
                                @click='$router.push("/register")'
                            >Create Account</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    methods: {
        createLogin: async function() {
            try {
                this.loading = true;

                const body = await window.std('/api/login', {
                    method: 'POST',
                    body: {
                        username: this.username,
                        password: this.password
                    }
                });

                this.loading = false;

                localStorage.token = body.token;

                this.$emit('auth');
                this.$router.push('/data')
            } catch (err) {
                this.loading = false;
                throw err;
            }
        }
    }
}
</script>
