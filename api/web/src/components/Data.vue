<template>
    <div class='col col--12 pt12'>

        <div class='round border border--green pb12 mb12'>
            <h3 class='align-center pb12'>New Features</h3>

            <div class='grid'>
                <div class='col col--4 flex flex--center-main'>
                    <svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-building-community" /></svg>
                    Buildings
                </div>
                <div class='col col--4 flex flex--center-main'>
                    <svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-map-pin" /></svg>
                    Addresses
                </div>
                <div class='col col--4 flex flex--center-main'>
                    <svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-shape" /></svg>
                    Parcels
                </div>
                <div class='col col--12'>
                    <div class='align-center pt12'>
                        After many months of work, we've expanded the project to include parcels and building polygons.
                        Look for the symbols above in the data sources to download the new layers
                    </div>
                </div>
            </div>
        </div>

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
                        <span v-text='fmt(c.created)'/>
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

                        <div class='col col--9 px6'>
                            <QuerySource @source='filter.source = $event'/>
                        </div>
                        <div class='col col--3 px6'>
                            <QueryLayer @layer='filter.layer = $event'/>
                        </div>
                        <div class='col col--6 px6'>
                            <label class='switch-container mr6'>
                                <input type='checkbox' v-model='filter.switches.before'/>
                                <div class='switch switch--gray'></div>
                            </label>
                            <label>Before</label>
                            <input class='input' type='date' v-model='filter.before'/>
                        </div>
                        <div class='col col--6 px6'>
                            <label class='switch-container mr6'>
                                <input type='checkbox' v-model='filter.switches.after'/>
                                <div class='switch switch--gray'></div>
                            </label>
                            <label>After</label>
                            <input class='input' type='date' v-model='filter.after'/>
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
            <div class='col col--9'>
                Source
            </div>
            <div class='col col--3'>
                <span class='fr'>Data Layers</span>
            </div>
        </div>

        <template v-if='loading.sources'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else-if='!datas.length'>
            <div class='flex flex--center-main'>
                <div class='py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Data Found</div>
            <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
        </template>
        <template v-else>
            <div :key='d.source' v-for='d in datas' class='col col--12 grid'>
                <div @click='d._open = !d._open' class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--9 clearfix'>
                        <span class='ml12 fl' v-text='d.source'/>
                        <span v-if='d.map' class='fl ml6'>
                            <svg @click='$router.push(`/location/${d.map}`)' class='icon color-gray color-black-on-hover' style='height: 20px; width: 20px; padding-top: 5px;'><use href='#icon-map'/></svg>
                        </span>
                    </div>
                    <div class='col col--3 color-gray'>
                        <span v-if='d.has.buildings' class='fr mx12'><svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-building-community" /></svg></span>
                        <span v-if='d.has.addresses' class='fr mx12'><svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-map-pin" /></svg></span>
                        <span v-if='d.has.parcels' class='fr mx12'><svg width="24" height="24"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-shape" /></svg></span>
                    </div>
                </div>
                <template v-if='d._open'>
                    <div :key='job.id' v-for='job in d.sources' class='pl24 col col--12'>
                        <div class='col col--12 grid py12 px12 cursor-pointer bg-darken10-on-hover round'>
                            <div @click='emitjob(job.job)' class='col col--5'>
                                <span v-text='job.layer'/> - <span v-text='job.name'/>

                            </div>
                            <div @click='emitjob(job.job)' class='col col--2'>
                                <span v-text='fmt(job.updated)'/>
                            </div>
                            <div class='col col--5'>
                                <Download :auth='auth' :job='job' @login='$emit("login")' @perk='$emit("perk", $event)'/>

                                <template v-if='auth && auth.access === "admin"'>
                                    <span class='dropdown fr h24 cursor-pointer mx3 px12 round color-gray border border--transparent border--gray-on-hover'>
                                        <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-settings" /></svg>

                                        <div class='round dropdown-content'>
                                            <label class='switch-container'>
                                                <input @change='updateData(job)' v-model='job.fabric' type='checkbox' />
                                                <div class='switch switch--blue mx6'></div>
                                                Fabric
                                            </label>
                                        </div>
                                    </span>
                                </template>

                                <span v-on:click.stop.prevent='emithistory(job.id)' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--transparent border--gray-on-hover'>
                                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-history" /></svg>
                                </span>

                                <span v-if='job.size > 0' class='fr mx6 bg-gray-faint color-gray inline-block px6 py3 round txt-xs txt-bold' v-text='size(job.size)'></span>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </template>
    </div>
</template>

<script>

import Download from './Download.vue';
import Coverage from './Coverage.vue';
import QuerySource from './query/Source.vue';
import QueryLayer from './query/Layer.vue';
import moment from 'moment-timezone';

export default {
    name: 'Data',
    props: ['auth'],
    data: function() {
        return {
            tz: moment.tz.guess(),
            loading: {
                sources: false,
                collections: false
            },
            showFilter: false,
            filter: {
                switches: {
                    before: false,
                    after: false
                },
                point: false,
                source: '',
                layer: 'all',
                before: '',
                after: ''
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
        'filter.switches.after': function() {
            this.refresh();
        },
        'filter.switches.before': function() {
            this.refresh();
        },
        'filter.after': function() {
            this.filter.switches.after = true;
            this.refresh();
        },
        'filter.before': function() {
            this.filter.switches.before = true;
            this.refresh();
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
        fmt: function(date) {
            return moment(date).tz(this.tz).format('YYYY-MM-DD');
        },
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
        emithistory: function(jobid) {
            this.$router.push({ path: `/data/${jobid}/history` })
        },
        datapls: function(jobid, fmt) {
            if (!this.auth.username) return this.$emit('login');

            if (fmt && this.auth.level === 'basic') {
                return this.$emit('perk');
            }

            this.external(`${window.location.origin}/api/job/${jobid}/output/source.geojson.gz?token=${localStorage.token}`);
        },
        collectionpls: function(c) {
            if (!this.auth.username) return this.$emit('login');
            this.external(`${window.location.origin}/api/collections/${c.id}/data?token=${localStorage.token}`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        getCollections: async function() {
            try {
                this.loading.collections = true;
                this.collections = await window.std('/api/collections');
                this.loading.collections = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        updateData: async function(job) {
            try {
                await window.std(`/api/data/${job.id}`, {
                    method: 'PATCH',
                    body: {
                        fabric: job.fabric
                    }
                });
            } catch (err) {
                this.$emit('err', err);
            }
        },
        getData: async function() {
            try {
                this.loading.sources = true;

                const url = new URL(`${window.location.origin}/api/data`);
                if (this.filter.source) url.searchParams.set('source', this.filter.source);
                if (this.filter.layer !== 'all') url.searchParams.set('layer', this.filter.layer);
                if (this.filter.point) url.searchParams.set('point', this.filter.point.join(','));
                if (this.filter.switches.after && this.filter.after) url.searchParams.set('after', this.filter.after);
                if (this.filter.switches.before && this.filter.before) url.searchParams.set('before', this.filter.before);

                const res = await window.std(url);
                const dataname = {};

                for (const data of res) {
                    if (dataname[data.source]) {
                        dataname[data.source].push(data);
                    } else {
                        dataname[data.source] = [data];
                    }
                }

                const data = [];

                for (const sourcename of Object.keys(dataname)) {
                    const d = {
                        _open: false,
                        source: sourcename,
                        map: false,
                        has: {
                            addresses: false,
                            buildings: false,
                            parcels: false
                        },
                        sources: []
                    };

                    for (const source of dataname[sourcename]) {
                        d.has[source.layer] = true;
                        d.sources.push(source);
                        if (source.map) d.map = source.map;
                    }

                    data.push(d);
                }

                this.datas = data;

                this.loading.sources = false;
            } catch (err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        Coverage,
        QuerySource,
        QueryLayer,
        Download
    }
}
</script>
