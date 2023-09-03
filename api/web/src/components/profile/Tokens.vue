<template>
<div class='card'>
    <div class='card-header'>
        <h3 class='card-title'>API Tokens:</h3>
        <div class='d-flex ms-auto btn-list'>
            <PlusIcon @click='newToken.show = true' class='cursor-pointer'/>
            <RefreshIcon @click='refresh' class='cursor-pointer'/>
        </div>
    </div>
    <TablerLoading v-if='loading' desc='Loading Tokens'/>
    <TablerNone v-else-if='!tokens.length && !newToken.show' :create='false' label='Tokens'/>
    <template v-else>
        <template v-if='newToken.show && !newToken.token'>
            <div class='col-12 row'>
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
        </template>
        <template v-if='newToken.show && newToken.token'>
            <div class='col-12'>
                <h2 class='txt-bold fl' v-text='newToken.name'></h2>
                <button @click='newToken.show = false' class='fr btn round btn--s btn--stroke btn--gray'>
                    <svg class='icon'><use xlink:href='#icon-close'/></svg>
                </button>
            </div>

            <div class='col col--12'>
                <pre class='pre txt--s' v-text='newToken.token'/>
            </div>
        </template>
        <template v-else>
            <table class="table table-hover table-vcenter card-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Attributes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr :key='token.id' v-for='token in tokens' class='cursor-pointer'>
                        <td><span v-text='token.name'/></td>
                        <td>
                            <div class='d-flex'>
                                <div class='ms-auto'>
                                    <TrashIcon @click='deleteToken(token.id)' class='cursor-pointer'/>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </template>
    </template>
</div>
</template>

<script>
import {
    TablerLoading,
    TablerNone
} from '@tak-ps/vue-tabler';
import {
    PlusIcon,
    TrashIcon,
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
        TrashIcon,
        RefreshIcon,
        TablerNone,
        TablerLoading
    }
}
</script>
