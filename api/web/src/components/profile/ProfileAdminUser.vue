<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>
                    <span class='bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold'>Admin</span>
                    Users:
                </h2>

                <div class='fr'>
                    <button @click='refresh' class='btn round btn--stroke color-gray mx3'>
                        <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                    </button>
                </div>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div :key='user.id' v-for='user in users' class='col col--12 grid'>
                <div @click='user._open = !user._open' class='col col--12 bg-gray-light-on-hover cursor-pointer px12 py12 round'>
                    <span v-text='user.username'/>
                    <span class='fr bg-blue-faint color-blue round inline-block px6 py3 txt-xs txt-bold' v-text='user.access'></span>
                </div>

                <div v-if='user._open' class='col col-12 border border--gray-light round px12 py12 my6'>
                    <h3 class='pb6'>User Flags</h3>

                    <label class='checkbox-container'>
                        <input @change='patchUser(user)' v-model='user.flags.upload' type='checkbox' />
                        <div class='checkbox mr6'>
                            <svg class='icon'><use xlink:href='#icon-check' /></svg>
                        </div>
                        Source Upload
                    </label>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'ProfileAdminUser',
    props: [ ],
    data: function() {
        return {
            loading: false,
            users: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    methods: {
        refresh: function() {
            this.getUsers();
        },
        getUsers: function() {
            this.loading = true;

            const url = new URL(`${window.location.origin}/api/user`);

            fetch(url, {
                method: 'GET'
            }).then((res) => {
                this.loading = false;

                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to load users');
                }
                return res.json();
            }).then((res) => {
                this.users = res.map((user) => {
                    user._open = false;
                    return user;
                });
            }).catch((err) => {
                this.$emit('err', err);
            });
        },
        patchUser: function(user) {
            const url = new URL(`${window.location.origin}/api/user/${user.id}`);

            fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    flags: user.flags
                })
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to update user');
                }
                return res.json();
            }).then((res) => {
                for (const key of Object.keys(res)) {
                    user[key] = res[key];
                }
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
