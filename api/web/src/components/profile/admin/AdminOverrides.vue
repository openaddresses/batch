<template>
<div class='card'>
    <div class='card-header d-flex'>
        <h2 class='card-title'>Level Overrides</h2>

        <div class='ms-auto btn-list'>
            <IconSearch @click='showFilter = true' v-if='!showFilter' class='cursor-pointer' size='32'/>
            <IconX @click='showFilter = false' v-else class='cursor-pointer' size='32'/>

            <IconPlus @click='addLevel' :disabled='add' class='cursor-pointer' size='32'/>

            <IconRefresh @click='getLevels' class='cursor-pointer' size='32'/>
        </div>
    </div>

    <template v-if='showFilter'>
        <div class='card-body row'>
            <div class='col-6'>
                <TablerInput label='Username/Email Filter' v-model='paging.pattern'/>
            </div>
            <div class='col-6'>
                <TablerEnum label='Level' v-model='paging.level' :options='["all", "basic", "backer", "sponsor"]'/>
            </div>
        </div>
    </template>

    <div v-if='add' class='col col--12 grid border border--gray-light round px12 py12 my6 grid'>
        <div class='col col--12 pb6'>
            <h2 class='txt-bold fl'>New Level Override</h2>
            <button @click='add = false' class='fr btn round btn--s btn--stroke btn--gray'>
                <svg class='icon'><use xlink:href='#icon-close'/></svg>
            </button>
        </div>

        <div class='col col--12 grid grid--gut12'>
            <div class='col col--9'>
                <label>Email RegExp Pattern </label>
                <input class='input' v-model='newLevel.pattern'/>
            </div>

            <div class='col col--3'>
                <label>Account Level</label>
                <div class='w-full select-container'>
                    <select v-model='newLevel.level' class='select select--stroke'>
                        <option>basic</option>
                        <option>backer</option>
                        <option>sponsor</option>
                    </select>
                    <div class='select-arrow'></div>
                </div>
            </div>

            <div class='col col--12 clearfix'>
                <div class='col col--2 fr'>
                    <button @click='createLevel' class='my12 w-full btn btn--stroke round color-gray color-green-on-hover'>
                        <svg class='fl icon mt6'><use href='#icon-check'/></svg><span>Save</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <TablerLoading v-if='loading'/>
    <TablerNone v-else-if='!list.total' :create='false'/>
    <template v-else>
        <table class="table table-vcenter card-table">
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
                        <td v-text='level.pattern'></td>
                        <td v-text='level.level'></td>
                        <td>
                            <div class='d-flex'>
                                <div class='ms-auto btn-list'>
                                    <IconTrash @click='deleteLevel(level)' class='cursor-pointer' size='32'/>
                                </div>
                            </div>
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
        <TableFooter :limit='paging.limit' :total='list.total' @page='paging.page = $event'/>
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
    TablerNone
} from '@tak-ps/vue-tabler';

export default {
    name: 'AdminOverrides',
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
    mounted: async function() {
        await this.getLevels();
    },
    watch:  {
        paging: {
            deep: true,
            handler: async function() {
                await this.getLevels();
            },
        }
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
    },
    components: {
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
    }
}
</script>
