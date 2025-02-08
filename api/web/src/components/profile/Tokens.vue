<template>
    <div class='card'>
        <div class='card-header'>
            <h3 class='card-title'>
                API Tokens:
            </h3>
            <div class='d-flex ms-auto btn-list'>
                <IconPlus
                    class='cursor-pointer'
                    size='32'
                    @click='newToken.show = true'
                />
                <IconRefresh
                    class='cursor-pointer'
                    size='32'
                    @click='refresh'
                />
            </div>
        </div>
        <TablerLoading
            v-if='loading'
            desc='Loading Tokens'
        />
        <TablerNone
            v-else-if='!tokens.length && !newToken.show'
            :create='false'
            label='Tokens'
        />
        <template v-else>
            <template v-if='newToken.show && !newToken.token'>
                <div class='mx-2 my-2 py-2 px-2'>
                    <div class='col-12 row border rounded'>
                        <div class='col-12'>
                            <h2 class='subheader'>
                                Create New Token
                            </h2>
                            <IconX
                                class='cursor-pointer'
                                size='32'
                                @click='newToken.show = false'
                            />
                        </div>

                        <div class='col-10'>
                            <TablerInput
                                v-model='newToken.name'
                                label='Token Name'
                                type='text'
                                placeholder='Token Name'
                            />
                        </div>
                        <div class='col-2'>
                            <IconCheck
                                class='cursor-pointer'
                                size='32'
                                @click='setToken'
                            />
                        </div>
                    </div>
                </div>
            </template>
            <template v-if='newToken.show && newToken.token'>
                <div class='col-12'>
                    <h2
                        class='txt-bold fl'
                        v-text='newToken.name'
                    />
                    <IconX
                        class='cursor-pointer'
                        size='32'
                        @click='newToken.show = false'
                    />
                </div>

                <div class='col-12'>
                    <pre
                        class='pre txt--s'
                        v-text='newToken.token'
                    />
                </div>
            </template>
            <template v-else>
                <table class='table table-hover table-vcenter card-table'>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Attributes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='token in tokens'
                            :key='token.id'
                            class='cursor-pointer'
                        >
                            <td><span v-text='token.name' /></td>
                            <td>
                                <div class='d-flex'>
                                    <div class='ms-auto'>
                                        <IconTrash
                                            class='cursor-pointer'
                                            size='32'
                                            @click='deleteToken(token.id)'
                                        />
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
    TablerInput,
    TablerNone
} from '@tak-ps/vue-tabler';
import {
    IconX,
    IconPlus,
    IconTrash,
    IconRefresh,
    IconCheck
} from '@tabler/icons-vue';

export default {
    name: 'Tokens',
    components: {
        IconX,
        IconPlus,
        IconTrash,
        IconRefresh,
        IconCheck,
        TablerInput,
        TablerNone,
        TablerLoading
    },
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
    watch: {
        'newToken.show': function() {
            if (!this.newToken.show) {
                this.newToken.name = '';
                this.newToken.token = '';
            }

            this.getTokens();
        }
    },
    mounted: function() {
        this.refresh();
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
    }
}
</script>
