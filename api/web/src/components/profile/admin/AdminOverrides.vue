<template>
    <div class='card'>
        <div class='card-header d-flex'>
            <h2 class='card-title'>
                Level Overrides
            </h2>

            <div class='ms-auto btn-list'>
                <TablerIconButton
                    v-if='!showFilter'
                    title='Show filters'
                    @click='showFilter = true'
                >
                    <IconSearch
                        :size='32'
                        stroke='1'
                    />
                </TablerIconButton>
                <TablerIconButton
                    v-else
                    title='Hide filters'
                    @click='showFilter = false'
                >
                    <IconX
                        :size='32'
                        stroke='1'
                    />
                </TablerIconButton>

                <TablerIconButton
                    title='Add level'
                    :disabled='add'
                    @click='addLevel'
                >
                    <IconPlus
                        :size='32'
                        stroke='1'
                    />
                </TablerIconButton>

                <TablerIconButton
                    title='Refresh levels'
                    @click='getLevels'
                >
                    <IconRefresh
                        :size='32'
                        stroke='1'
                    />
                </TablerIconButton>
            </div>
        </div>

        <template v-if='showFilter'>
            <div class='card-body row'>
                <div class='col-6'>
                    <TablerInput
                        v-model='paging.pattern'
                        label='Username/Email Filter'
                    />
                </div>
                <div class='col-6'>
                    <TablerEnum
                        v-model='paging.level'
                        label='Level'
                        :options='["all", "basic", "backer", "sponsor"]'
                    />
                </div>
            </div>
        </template>

        <div
            v-if='add'
            class='card-body border-top'
        >
            <div class='d-flex mb-2'>
                <h3 class='card-title'>
                    New Level Override
                </h3>
                <div class='ms-auto'>
                    <TablerIconButton
                        title='Cancel'
                        @click='add = false'
                    >
                        <IconX
                            :size='32'
                            stroke='1'
                        />
                    </TablerIconButton>
                </div>
            </div>

            <div class='row'>
                <div class='col-9'>
                    <TablerInput
                        v-model='newLevel.pattern'
                        label='Email RegExp Pattern'
                    />
                </div>

                <div class='col-3'>
                    <TablerEnum
                        v-model='newLevel.level'
                        label='Account Level'
                        :options='["basic", "backer", "sponsor"]'
                    />
                </div>
            </div>

            <div class='d-flex mt-3'>
                <button
                    class='btn btn-primary ms-auto'
                    @click='createLevel'
                >
                    Save
                </button>
            </div>
        </div>

        <TablerLoading v-if='loading' />
        <TablerNone
            v-else-if='!list.total'
            :create='false'
        />
        <template v-else>
            <table class='table table-vcenter card-table'>
                <thead>
                    <tr>
                        <th>Pattern</th>
                        <th>Level</th>
                        <th>Attributes</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for='level in list.levels'>
                        <tr>
                            <td v-text='level.pattern' />
                            <td v-text='level.level' />
                            <td>
                                <div class='d-flex'>
                                    <div class='ms-auto btn-list'>
                                        <TablerIconButton
                                            title='Delete level'
                                            @click='deleteLevel(level)'
                                        >
                                            <IconTrash
                                                :size='32'
                                                stroke='1'
                                            />
                                        </TablerIconButton>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
            <TableFooter
                :limit='paging.limit'
                :total='list.total'
                @page='paging.page = $event'
            />
        </template>
    </div>
</template>

<script>
import TableFooter from '../../util/TableFooter.vue';
import {
    IconSearch,
    IconPlus,
    IconRefresh,
    IconTrash,
    IconX
} from '@tabler/icons-vue';

import {
    TablerInput,
    TablerEnum,
    TablerLoading,
    TablerNone,
    TablerIconButton
} from '@tak-ps/vue-tabler';

export default {
    name: 'AdminOverrides',
    components: {
        TablerIconButton,
        IconSearch,
        IconPlus,
        IconRefresh,
        IconTrash,
        IconX,
        TablerNone,
        TablerInput,
        TablerEnum,
        TablerLoading,
        TableFooter,
    },
    props: [ ],
    data: function() {
        return {
            loading: false,
            add: false,
            newLevel: {
                pattern: '',
                level: 'basic'
            },
            paging: {
                pattern: '',
                level: 'all',
                page: 0,
                limit: 10,
                sort: 'id',
                order: 'desc'
            },
            showFilter: false,
            list: {
                total: 0,
                levels: []
            }
        };
    },
    watch:  {
        paging: {
            deep: true,
            handler: async function() {
                await this.getLevels();
            },
        }
    },
    mounted: async function() {
        await this.getLevels();
    },
    methods: {
        addLevel: async function() {
            this.add = true;
        },
        getLevels: async function() {
            this.loading = true;

            const url = new URL(`${window.location.origin}/api/level`);
            url.searchParams.append('limit', this.paging.limit)
            url.searchParams.append('page', this.paging.page)
            url.searchParams.append('filter', this.paging.pattern)

            if (this.paging.level !== 'all') url.searchParams.append('level', this.paging.level)

            const res = await window.std(url);
            this.list = {
                total: res.total,
                levels: res.level_override
            }

            this.loading = false;
        },
        createLevel: async function() {
            const res = await window.std(`/api/level`, {
                method: 'POST',
                body: {
                    pattern: this.newLevel.pattern,
                    level: this.newLevel.level
                }
            });

            this.list.levels.push(res);

            this.add = false;
            this.newLevel.pattern = '';
            this.newLevel.level = 'basic';
        },
        deleteLevel: async function(level) {
            await window.std(`/api/level/${level.id}`, {
                method: 'DELETE'
            });

            this.getLevels();
        },
    }
}
</script>
