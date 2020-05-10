<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>Profile:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>

        <template v-if='loading.profile'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12 grid grid--gut12'>
                <div class='col col--6 pt12'>
                    <label>Username:</label>
                    <input v-model='profile.username' class='input' placeholder='Username'/>
                </div>
                <div class='col col--6 pt12'>
                    <label>Email:</label>
                    <input v-model='profile.email' class='input' placeholder='Username'/>
                </div>
                <div class='col col--12 clearfix pt12'>
                    <button disabled class='btn btn--stroke btn--gray btn--s round fr'>Update</button>
                </div>
            </div>
        </template>

        <ProfileTokens @err='$emit("err", $event)'/>

        <ProfileAdmin v-if='profile.access === "admin"' @err='$emit("err", $event)'/>
    </div>
</template>

<script>
import ProfileAdmin from './profile/ProfileAdmin.vue'
import ProfileTokens from './profile/ProfileTokens.vue'

export default {
    name: 'Profile',
    props: [ ],
    data: function() {
        return {
            profile: {
                username: '',
                access: '',
                email: ''
            },
            tokens: [],
            loading: {
                profile: false,
                tokens: false
            }
        };
    },
    mounted: function() {
        this.refresh();
    },
    methods: {
        refresh: function() {
            this.getUser();
        },
        getUser: function() {
            const url = new URL(`${window.location.origin}/api/user/me`);

            fetch(url, {
                method: 'GET'
            }).then((res) => {
                if (res.status !== 200 && res.status !== 304 && res.message) {
                    throw new Error(res.message);
                } else if (res.status !== 200 && status !== 304) {
                    throw new Error('Failed to load profile');
                }
                return res.json();
            }).then((res) => {
                this.profile = res;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    },
    components: {
        ProfileAdmin,
        ProfileTokens
    }
}
</script>
