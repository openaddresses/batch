<template>
<div class='card'>
    <div class='card-header'>
        <h3 class='card-title'>API Tokens:</h3>
        <div class='d-flex ms-auto btn-list'>
            <PlusIcon @click='newToken.show = true' class='cursor-pointer'/>
            <RefreshIcon @click='refresh' class='cursor-pointer'/>
        </div>
    </div>
    <div class='card-body'>
        <TablerLoading v-if='loading' desc='Loading Tokens'/>
        <template v-else-if='!tokens.length && !newToken.show'>
            <div class='col col--12'>
                <div class='flex flex--center-main'>
                    <div class='py24'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                    </div>
                </div>
                <div class='w-full align-center'>You haven't created any API tokens yet</div>
            </div>
        </template>
        <template v-else>
            <template v-if='newToken.show && !newToken.token'>
                <div class='col col--12 border border--gray-light round my12'>
                    <div class='col col--12 grid grid--gut12 pl12 py6'>
                        <div class='col col--12 pb6'>
                            <h2 class='txt-bold fl'>Create New Token</h2>
                            <button @click='newToken.show = false' class='fr btn round btn--s btn--stroke btn--gray'>
                                <svg class='icon'><use xlink:href='#icon-close'/></svg>
                            </button>
                        </div>

                        <div class='col col--12'>
                            <label>Token Name</label>
                        </div>
                        <div class='col col--10'>
                            <input v-model='newToken.name' type='text' class='input' placeholder='Token Name'/>
                        </div>
                        <div class='col col--2'>
                            <button @click='setToken' class='fr btn btn--stroke round color-gray color-green-on-hover h-full w-full'>
                                <svg class='fl icon mt6'><use href='#icon-check'/></svg><span>Save</span>
                            </button>
                        </div>
                    </div>
                </div>
            </template>
            <template v-if='newToken.show && newToken.token'>
                <div class='col col--12 border border--gray-light round my12'>
                    <div class='col col--12 grid grid--gut12 pl12 py6'>
                        <div class='col col--12 pb6'>
                            <h2 class='txt-bold fl' v-text='newToken.name'></h2>
                            <button @click='newToken.show = false' class='fr btn round btn--s btn--stroke btn--gray'>
                                <svg class='icon'><use xlink:href='#icon-close'/></svg>
                            </button>
                        </div>

                        <div class='col col--12'>
                            <pre class='pre txt--s' v-text='newToken.token'/>
                        </div>
                    </div>
                </div>
            </template>
            <div :key='token.id' v-for='token in tokens' class='col col--12 grid bg-gray-light-on-hover cursor-default round px12 py12'>
                <div class='col col--10' v-text='token.name'></div>
                <div class='col col--2'>
                    <button @click='deleteToken(token.id)' class='fr btn round btn--s btn--stroke color-gray color-red-on-hover h-full'>
                        <svg class='icon'><use xlink:href='#icon-trash'/></svg>
                    </button>
                </div>
            </div>
        </template>
    </div>
</div>
</template>

<script>
import {
    TablerLoading
} from '@tak-ps/vue-tabler';
import {
    PlusIcon,
    RefreshIcon,
} from 'vue-tabler-icons';

export default {
    name: 'Tokens',
    props: [ ],
    data: function() {
        return {
            newToken: {
                show: false,
                name: '',
                token: false
            },
            tokens: [],
            loading: false
        };
    },
    mounted: function() {
        this.refresh();
    },
    watch: {
        'newToken.show': function() {
            if (!this.newToken.show) {
                this.newToken.name = '';
                this.newToken.token = '';
            }

            this.getTokens();
        }
    },
    methods: {
        refresh: function() {
            this.newToken.show = false;
            this.newToken.name = '';
            this.newToken.token = false;

            this.getTokens();
        },
        setToken: async function() {
            try {
                const res = await window.std('/api/token', {
                    method: 'POST',
                    body: {
                        name: this.newToken.name
                    }
                });

                this.newToken.token = res.token;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        getTokens: async function() {
            try {
                this.loading = true;
                this.tokens = (await window.std('/api/token')).tokens;
                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        deleteToken: async function(token_id) {
            try {
                await window.std(`/api/token/${token_id}`, {
                    method: 'DELETE'
                });

                this.getTokens();
            } catch (err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        PlusIcon,
        RefreshIcon,
        TablerLoading
    }
}
</script>
