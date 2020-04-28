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
                    <button class='btn btn--stroke btn--gray btn--s round fr'>Update</button>
                </div>
            </div>
        </template>

        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>API Tokens:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>

        <template v-if='loading.tokens'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else-if='!tokens.length'>
            <div class='col col--12'>
                <div class='flex-parent flex-parent--center-main'>
                    <div class='flex-child py24'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                    </div>
                </div>
                <div class='w-full align-center'>You haven't created any API tokens yet</div>
            </div>
        </template>
        <template v-else>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Profile',
    props: [ ],
    data: function() {
        return {
            profile: {
                username: '',
                email: '',
                password: ''
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
            //this.getUser();
        },
        getUser: function() {
            const url = new URL(`${window.location.origin}/api/data/history`);
            url.searchParams.set('status', ['Warn', 'Fail']);

            fetch(url, {
                method: 'Get'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.problems = res;
            });
        }
    }
}
</script>
