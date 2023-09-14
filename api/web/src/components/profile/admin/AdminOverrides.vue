<template>
<div class='card'>
    <div class='card-header d-flex'>
        <h2 class='card-title'>Level Overrides</h2>

        <div class='ms-auto btn-list'>
            <SearchIcon @click='showFilter = true' v-if='!showFilter' class='cursor-pointer'/>
            <XIcon @click='showFilter = false' v-else class='cursor-pointer'/>

            <PlusIcon @click='addLevel' :disabled='add' class='cursor-pointer'/>

            <RefreshIcon @click='getLevels' class='cursor-pointer'/>
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
    <TablerNone v-else-if='!list.total'/>
    <template v-else>
        <table class="table table-vcenter card-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Attributes</th>
                </tr>
            </thead>
            <tbody>
                <template v-for='level in list.levels'>
                </template>
            </tbody>
        </table>
        <TableFooter :limit='paging.limit' :total='list.total' @page='paging.page = $event'/>
    </template>

<!--
    <div class='grid col col--12 bg-gray-light-on-hover cursor-pointer px12 py12 round relative'>
        <div class='col col--11 relative'>
            <span class='txt-truncate pre' v-text='level.pattern'/>

            <div class='absolute' style='top: 11px; right: 11px;'>
                <span class='mx3 fr bg-purple-faint color-purple round inline-block px6 py3 txt-xs txt-bold' v-text='level.level'></span>
            </div>
        </div>
        <div class='col col--1'>
            <button @click='deleteLevel(level)' style='margin-top: 9px;' class='mx6 btn btn--stroke round color-gray color-red-on-hover'>
                <svg class='icon'><use xlink:href='#icon-trash'/></svg>
            </button>
        </div>
    </div>
-->
</div>
</template>

<script>
import TableFooter from '../../util/TableFooter.vue';
import {
    SearchIcon,
    PlusIcon,
    RefreshIcon,
    XIcon
} from 'vue-tabler-icons';

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
        PlusIcon,
        SearchIcon,
        RefreshIcon,
        TablerNone,
        TablerInput,
        TablerEnum,
        TablerLoading,
        TableFooter,
        XIcon,
    }
}
</script>
