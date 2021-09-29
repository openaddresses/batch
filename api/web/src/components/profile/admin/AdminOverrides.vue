<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>
                    <span class='bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold'>Admin</span>
                    Level Overrides:
                </h2>

                <div class='fr'>
                    <button @click='showFilter = !showFilter' class='btn round btn--stroke color-gray mr12'>
                        <svg v-if='!showFilter' class='icon'><use href='#icon-search'/></svg>
                        <svg v-else class='icon'><use href='#icon-close'/></svg>
                    </button>

                    <button @click='addLevel' :disabled='add' class='btn round btn--stroke color-gray color-green-on-hover mr12'>
                        <svg class='icon'><use xlink:href='#icon-plus'/></svg>
                    </button>

                    <button @click='refresh' class='btn round btn--stroke color-gray'>
                        <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                    </button>
                </div>
            </div>
        </div>

        <template v-if='showFilter'>
            <div class='col col--12 grid border border--gray px6 py6 round mb12 relative'>
                <div class='absolute triangle--u triangle color-gray' style='top: -12px; right: 75px;'></div>

                <div class='col col--6 px6'>
                    <label>Username/Email Filter</label>
                    <input v-model='filter.pattern' class='input' placeholder='john-doe' />
                </div>
                <div class='col col--3 px6'>
                    <label>Access</label>
                    <div class='w-full select-container'>
                        <select v-model='filter.access' class='select select--stroke'>
                            <option>all</option>
                            <option>disabled</option>
                            <option>admin</option>
                            <option>user</option>
                        </select>
                        <div class='select-arrow'></div>
                    </div>
                </div>
                <div class='col col--3 px6'>
                    <label>Level</label>
                    <div class='w-full select-container'>
                        <select v-model='filter.level' class='select select--stroke'>
                            <option>all</option>
                            <option>basic</option>
                            <option>backer</option>
                            <option>sponsor</option>
                        </select>
                        <div class='select-arrow'></div>
                    </div>
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

        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else-if='!levels.length'>
            <div class='flex flex--center-main w-full'>
                <div class='py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Level Overrides Found</div>
        </template>
        <template v-else>
            <div :key='level.id' v-for='level in levels' class='col col--12 grid'>
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
            </div>
        </template>

        <Pager v-if='levels.length' @page='page = $event' :perpage='perpage' :total='total'/>
    </div>
</template>

<script>
import Pager from '../../util/Pager.vue';

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
            filter: {
                pattern: '',
                level: 'all',
                access: 'all'
            },
            showFilter: false,
            page: 0,
            perpage: 15,
            total: 100,
            levels: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    watch:  {
        page: function() {
            this.getLevels();
        },
        'filter.pattern': function() {
            this.page = 0;
            this.getLevels();
        },
        'filter.level': function() {
            this.page = 0;
            this.getLevels();
        },
    },
    methods: {
        refresh: function() {
            this.getLevels();
        },
        addLevel: async function() {
            this.add = true;
        },
        getLevels: async function() {
            try {
                this.loading = true;

                const url = new URL(`${window.location.origin}/api/level`);
                url.searchParams.append('limit', this.perpage)
                url.searchParams.append('page', this.page)
                url.searchParams.append('filter', this.filter.pattern)

                if (this.filter.level !== 'all') url.searchParams.append('level', this.filter.level)

                const res = await window.std(url);
                this.total = res.total;
                this.levels = res.level_override.map((level) => {
                    level._open = false;
                    return level;
                });

                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        createLevel: async function(level) {
            try {
                const res = await window.std(`/api/level`, {
                    method: 'POST',
                    body: {
                        pattern: this.newLevel.pattern,
                        level: this.newLevel.level
                    }
                });

                this.levels.push(res);
            } catch (err) {
                this.$emit('err', err);
            }
        },
        deleteLevel: async function(level) {
            try {
                const res = await window.std(`/api/level/${level.id}`, {
                    method: 'DELETE'
                });
                
                this.getLevels();
            } catch (err) {
                this.$emit('err', err);
            }
        },
    },
    components: {
        Pager
    }
}
</script>
