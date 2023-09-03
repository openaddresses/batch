<template>
<div class='page-body'>
    <div class='container-xl'>
        <div class='row row-deck row-cards'>
            <div class='col-12'>
                <div class='card'>
                    <div class='card-header'>
                        <h3 class='card-title'>New Features</h3>
                    </div>
                    <div class='card-body row'>
                        <div class='col-4 d-flex justify-content-center'>
                            <BuildingCommunityIcon width="24" height="24"/>
                            Buildings
                        </div>
                        <div class='col-4 d-flex justify-content-center'>
                            <MapPinIcon width="24" height="24"/>
                            Addresses
                        </div>
                        <div class='col-4 d-flex justify-content-center'>
                            <ShapeIcon width="24" height="24"/>
                            Parcels
                        </div>
                        <div class='col-12'>
                            <div class='text-center pt-3'>
                                <div>After many months of work, we've expanded the project to include parcels and building polygons.</div>
                                <div>Look for the symbols above in the data sources to download the new layers</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class='col-12'>
                <div class='card'>
                    <div class='card-header'>
                        <h2 class='card-title'>Data Collections</h2>

                        <div class='ms-auto btn-list'>
                            <RefreshIcon @click='fetchCollections' class='cursor-pointer'/>
                        </div>
                    </div>

                    <TablerLoading v-if='loading.collections' desc='Loading Collections'/>
                    <table v-else class="table table-hover table-vcenter card-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Updated</th>
                                <th>Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr :key='c.id' v-for='c in collections'>
                                <td v-text='c.name'></td>
                                <td v-text='fmt(c.created)'></td>
                                <td class='d-flex'>
                                    <span v-text='size(c.size)'/>
                                    <div class='ms-auto btn-list'>
                                        <DownloadIcon v-on:click.stop.prevent='collectionpls(c)' class='cursor-pointer'/>
                                    </div>
                                </td>

                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class='col-12'>
                <div class='card'>
                    <div class='card-header'>
                        <h2 class='card-title'>Individual Sources</h2>

                        <div class='ms-auto btn-list'>
                            <SearchIcon @click='showFilter = !showFilter' v-if='!showFilter' class='cursor-pointer'/>
                            <XIcon  @click='showFilter = !showFilter' v-else class='cursor-pointer'/>

                            <RefreshIcon @click='fetchData' class='cursor-pointer'/>
                        </div>
                    </div>

                    <template v-if='showFilter'>
                        <div class='row'>
                            <div class='col col--9 px6'>
                                <QuerySource
                                    showValidated=true
                                    @source='filter.source = $event'
                                    @validated='filter.validated = $event'
                                />
                            </div>
                            <div class='col col--3 px6'>
                                <QueryLayer @layer='filter.layer = $event'/>
                            </div>
                            <div class='col col--6 px6'>
                                <label class='switch-container mr6'>
                                    <input type='checkbox' v-model='filter.switches.before'/>
                                    <div class='switch switch--gray'></div>
                                </label>
                                <TablerInput label='After' type='date' v-model='filter.after'/>
                            </div>
                            <div class='col col--6 px6'>
                                <label class='switch-container mr6'>
                                    <input type='checkbox' v-model='filter.switches.after'/>
                                    <div class='switch switch--gray'></div>
                                </label>
                                <TablerInput label='After' type='date' v-model='filter.after'/>
                            </div>
                        </div>
                    </template>

                    <TablerLoading v-if='loading.sources' desc='Loading Sources'/>
                    <template v-else>
                        <Coverage
                            @err='$emit("err", $event)'
                            v-on:point='filter.point = $event'
                            :layer='filter.layer'
                        />

                        <table class="table table-hover table-vcenter card-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Attributes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr @click='$router.push(`/location/${d.map}`)' :key='d.source' v-for='d in datas' class='cursor-pointer'>
                                    <td v-text='d.source'></td>
                                    <td>
                                        <span v-if='d.has.buildings' class='fr mx12'><BuildingCommunityIcon width="24" height="24"/></span>
                                        <span v-if='d.has.addresses' class='fr mx12'><MapPinIcon width="24" height="24"/></span>
                                        <span v-if='d.has.parcels' class='fr mx12'><ShapeIcon width="24" height="24"/></span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </template>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import {
    SettingsIcon,
    DownloadIcon,
    HistoryIcon,
    BuildingCommunityIcon,
    MapPinIcon,
    ShapeIcon,
    RefreshIcon,
    SearchIcon,
    XIcon,
} from 'vue-tabler-icons';
import Download from './util/Download.vue';
import Coverage from './util/Coverage.vue';
import QuerySource from './query/Source.vue';
import QueryLayer from './query/Layer.vue';
import moment from 'moment-timezone';
import {
    TablerLoading,
    TablerInput
} from '@tak-ps/vue-tabler';

export default {
    name: 'OAData',
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
                validated: false,
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
        this.fetchCollections();
        this.fetchData();
    },
    watch: {
        showFilter: function() {
            this.filter.source = '';
            this.filter.layer = 'all';
        },
        filter: {
            deep: true,
            handler: async function() {
                await this.fetchData();
            }
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
        fetchCollections: async function() {
            try {
                this.loading.collections = true;
                this.collections = await window.std('/api/collections');
                this.loading.collections = false;
            } catch (err) {
                this.$emit('err', err);
            }
        },
        deleteData: async function(job) {
            try {
                await window.std(`/api/data/${job.id}`, {
                    method: 'DELETE',
                });
            } catch (err) {
                this.$emit('err', err);
            }

            this.refresh();
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
        fetchData: async function() {
            try {
                this.loading.sources = true;

                const url = window.stdurl('/api/data');
                if (this.filter.source) url.searchParams.set('source', this.filter.source);
                if (this.filter.layer !== 'all') url.searchParams.set('layer', this.filter.layer);
                if (this.filter.point) url.searchParams.set('point', this.filter.point.join(','));
                if (this.filter.switches.after && this.filter.after) url.searchParams.set('after', this.filter.after);
                if (this.filter.switches.before && this.filter.before) url.searchParams.set('before', this.filter.before);
                if (this.filter.validated) url.searchParams.set('validated', this.filter.validated);

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
                        source._confirm = false;
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
        Download,
        SettingsIcon,
        DownloadIcon,
        RefreshIcon,
        HistoryIcon,
        TablerLoading,
        SearchIcon,
        XIcon,
        BuildingCommunityIcon,
        TablerInput,
        MapPinIcon,
        ShapeIcon
    }
}
</script>
