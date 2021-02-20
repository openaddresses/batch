<template>
    <div class='col col--12 pt12'>
        <div class='col col--12'>
            <div class='col col--12 grid border-b border--gray-light mb12'>
                <div class='col col--12'>
                    <h2 class='txt-h4 pb12 fl'>Data Collections:</h2>
                    <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                        <svg class='icon'><use href='#icon-refresh'/></svg>
                    </button>
                </div>

                <div class='col col--5'>Name</div>
                <div class='col col--2'>Updated</div>
                <div class='col col--5'><span class='fr'>Attributes</span></div>
            </div>
            <div v-on:click.stop.prevent='collectionpls(c)' :key='c.id' v-for='c in collections' class='col col--12 grid pb6'>
                <div class='col col--12 grid cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--5'>
                        <span class='ml12' v-text='c.name'/>
                    </div>
                    <div class='col col--2'>
                        <span v-text='c.created.match(/\d{4}-\d{2}-\d{2}/)[0]'/>
                    </div>
                    <div class='col col--5'>
                        <span class='fr h24 cursor-pointer mx3 px12 round color-gray border border--gray-light border--gray-on-hover'>
                            <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-download" /></svg>
                        </span>

                        <span class='fr mx6 bg-gray-faint color-gray inline-block px6 py3 round txt-xs txt-bold' v-text='size(c.size)'></span>
                    </div>
                </div>
            </div>
        </div>

        <div class='col col--12 grid pt12'>
            <div class='col col--12'>
                <div class='col col--12 clearfix pb12'>
                    <h2 class='txt-h4 fl'>Individual Sources:</h2>

                    <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                        <svg class='icon'><use href='#icon-refresh'/></svg>
                    </button>
                    <button @click='showFilter = !showFilter' class='btn round btn--stroke fr color-gray mr12'>
                        <svg v-if='!showFilter' class='icon'><use href='#icon-search'/></svg>
                        <svg v-else class='icon'><use href='#icon-close'/></svg>
                    </button>
                </div>

                <template v-if='showFilter'>
                    <div class='col col--12 grid border border--gray px6 py6 round mb12 relative'>
                        <div class='absolute triangle--u triangle color-gray' style='top: -12px; right: 75px;'></div>

                        <div class='col col--8 px6'>
                            <label>Source</label>
                            <input v-model='filter.source' class='input' placeholder='/ca/nb/provincewide' />
                        </div>
                        <div class='col col--4 px6'>
                            <label>Layer</label>
                            <div class='w-full select-container'>
                                <select v-model='filter.layer' class='select'>
                                    <option>all</option>
                                    <option>addresses</option>
                                    <option>buildings</option>
                                    <option>parcels</option>
                                </select>
                                <div class='select-arrow'></div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <div class='col col--12 mb12 my12 clearfix'>
            <Coverage
                @err='$emit("err", $event)'
                v-on:point='filter.point = $event'
                :layer='filter.layer'
            />
        </div>

        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--5'>
                Source
            </div>
            <div class='col col--2'>
                Updated
            </div>
            <div class='col col--5'>
                <span class='fr'>Attributes</span>
            </div>
        </div>

        <template v-if='loading.sources'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else-if='!datas.length'>
            <div class='flex-parent flex-parent--center-main'>
                <div class='flex-child py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Data Found</div>
            <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
        </template>
        <template v-else>
            <div :key='d.id' v-for='d in datas' class='col col--12 grid'>
                <div @click='emitjob(d.job)' class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--5'>
                        <span class='ml12' v-text='d.source'/>
                    </div>
                    <div class='col col--2'>
                        <span v-text='d.updated.match(/\d{4}-\d{2}-\d{2}/)[0]'/>
                    </div>
                    <div class='col col--5'>
                        <span v-on:click.stop.prevent='datapls(d)' v-if='d.output.output' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--gray-light border--gray-on-hover'>
                            <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-download" /></svg>
                        </span>

                        <span v-on:click.stop.prevent='emithistory(d)' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>History</span>
                        <span v-if='d.size > 0' class='fr mx6 bg-gray-faint color-gray inline-block px6 py3 round txt-xs txt-bold' v-text='size(d.size)'></span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>

import Coverage from './Coverage.vue';

export default {
    name: 'Data',
    props: ['auth'],
    data: function() {
        return {
            loading: {
                sources: false,
                collections: false
            },
            showFilter: false,
            filter: {
                point: false,
                source: '',
                layer: 'all'
            },
            datas: [],
            collections: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    watch: {
        showFilter: function() {
            this.filter.source = '';
            this.filter.layer = 'all';
        },
        'filter.point': function() {
            this.refresh();
        },
        'filter.layer': function() {
            this.refresh();
        },
        'filter.source': function() {
            this.refresh();
        }
    },
    methods: {
        size: function(bytes) {
            if (bytes == 0) { return "0.00 B"; }
            var e = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes/Math.pow(1024, e)).toFixed(2)+' '+' KMGTP'.charAt(e)+'B';
        },
        refresh: function() {
            this.getData();
            this.getCollections();
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` })
        },
        emithistory: function(d) {
            this.$router.push({ path: `/data/${d.id}/history` })
        },
        datapls: function(d) {
            if (!this.auth.username) return this.$emit('login');
            this.external(`${window.location.origin}/api/job/${d.job}/output/source.geojson.gz`);
        },
        collectionpls: function(c) {
            if (!this.auth.username) return this.$emit('login');
            this.external(`${window.location.origin}/api/collections/${c.id}/data`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        getCollections: function() {
            this.loading.collections = true;
            const url = new URL(`${window.location.origin}/api/collections`);

            fetch(url, {
                method: 'GET'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get collections');
                }

                return res.json();
            }).then((res) => {
                this.collections = res;

                this.loading.collections = false;
            }).catch((err) => {
                this.$emit('err', err);
            });
        },
        getData: function() {
            this.loading.sources = true;
            const url = new URL(`${window.location.origin}/api/data`);
            url.searchParams.set('source', this.filter.source);
            url.searchParams.set('layer', this.filter.layer);
            if (this.filter.point) url.searchParams.set('point', this.filter.point.join(','));

            fetch(url, {
                method: 'GET'
            }).then((res) => {
                if (res.status === 404) {
                    this.datas = [];
                } if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get data');
                }

                return res.json();
            }).then((res) => {
                this.datas = res;

                this.loading.sources = false;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    },
    components: {
        Coverage
    }
}
</script>
