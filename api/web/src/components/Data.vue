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
                            <LayerIcon layer='buildings'/>
                            Buildings
                        </div>
                        <div class='col-4 d-flex justify-content-center'>
                            <LayerIcon layer='addresses'/>
                            Addresses
                        </div>
                        <div class='col-4 d-flex justify-content-center'>
                            <LayerIcon layer='parcels'/>
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
                            <ArrowsMaximizeIcon @click='fullscreen = true' v-if='!fullscreen' class='cursor-pointer'/>
                            <ArrowsMinimizeIcon @click='fullscreen = false' v-else class='cursor-pointer'/>

                            <SearchIcon @click='showFilter = !showFilter' v-if='!showFilter' class='cursor-pointer'/>
                            <XIcon  @click='showFilter = !showFilter' v-else class='cursor-pointer'/>

                            <RefreshIcon @click='fetchData' class='cursor-pointer'/>
                        </div>
                    </div>

                    <template v-if='showFilter'>
                        <div class='card-body row'>
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
                                <TablerInput label='Before' type='date' v-model='filter.before'/>
                                <TablerToggle label='Before Enabled' v-model='filter.switches.before'/>
                            </div>
                            <div class='col col--6 px6'>
                                <TablerInput label='After' type='date' v-model='filter.after'/>
                                <TablerToggle label='After Enabled' v-model='filter.switches.after'/>
                            </div>
                        </div>
                    </template>

                    <TablerLoading v-if='loading.sources' desc='Loading Sources'/>
                    <template v-else>
                        <Coverage
                            :fullscreen='fullscreen'
                            @err='$emit("err", $event)'
                            v-on:point='filter.point = $event'
                            :layer='filter.layer'
                        />

                        <table class="table table-hover table-vcenter card-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Layers</th>
                                    <th>Attributes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template :key='d.source' v-for='d in datas'>
                                    <tr>
                                        <td @click='d._open = !d._open' v-text='d.source' class='cursor-pointer'></td>
                                        <td @click='d._open = !d._open' class='cursor-pointer'>
                                            <LayerIcon v-if='d.has.buildings' layer='buildings'/>
                                            <LayerIcon v-if='d.has.addresses' layer='addresses'/>
                                            <LayerIcon v-if='d.has.parcels' layer='parcels'/>
                                        </td>
                                        <td>
                                            <div class='d-flex'>
                                                <div class='ms-auto btn-list'>
                                                    <MapIcon v-if='d.map' @click='$router.push(`/location/${d.map}`)' class='cursor-pointer'/>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <template v-if='d._open' :key='job.id' v-for='job in d.sources'>
                                        <tr><td colspan='3' class='cursor-pointer'>
                                            <div class='row'>
                                                <div @click='emitjob(job.job)' class='col-5'>
                                                    <span v-text='job.layer'/> - <span v-text='job.name'/>

                                                </div>
                                                <div @click='emitjob(job.job)' class='col-2'>
                                                    <span v-text='fmt(job.updated)'/>
                                                </div>
                                                <div class='col-5 d-flex'>
                                                    <div class='ms-auto btn-list'>
                                                        <Download :auth='auth' :job='job' @login='$emit("login")' @perk='$emit("perk", $event)'/>

                                                        <template v-if='auth && auth.access === "admin"'>
                                                            <TablerDropdown>
                                                                <slot>
                                                                    <SettingsIcon class='cursor-pointer'/>
                                                                </slot>
                                                                <template #dropdown>
                                                                    <TablerToggle @change='updateData(job)' v-model='job.fabric' label='Fabric'/>
                                                                    <TablerDelete @delete='deleteData(job)'/>
                                                                </template>
                                                            </TablerDropdown>
                                                        </template>

                                                        <HistoryIcon @click='$router.push(`/data/${job.id}/history`)' class='cursor-pointer'/>
                                                    </div>
                                                </div>
                                            </div>
                                        </td></tr>
                                    </template>
                                </template>
                            </tbody>
                        </table>
                    </template>
                </div>
            </div>
        </div>
    </div>

    <MustLogin v-if='loginModal === true'/>
</div>
</template>

<script>
import {
    ArrowsMaximizeIcon,
    ArrowsMinimizeIcon,
    SettingsIcon,
    DownloadIcon,
    HistoryIcon,
    RefreshIcon,
    SearchIcon,
    MapIcon,
    XIcon,
} from 'vue-tabler-icons';
import LayerIcon from './util/LayerIcon.vue';
import MustLogin from './util/MustLogin.vue';
import Download from './util/Download.vue';
import Coverage from './util/Coverage.vue';
import QuerySource from './query/Source.vue';
import QueryLayer from './query/Layer.vue';
import moment from 'moment-timezone';
import {
    TablerLoading,
    TablerDropdown,
    TablerToggle,
    TablerDelete,
    TablerInput
} from '@tak-ps/vue-tabler';

export default {
    name: 'OAData',
    props: ['auth'],
    data: function() {
        return {
            tz: moment.tz.guess(),
            fullscreen: false,
            loading: {
                sources: false,
                collections: false
            },
            showFilter: false,
            loginModal: false,
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
        },
        datapls: function(jobid, fmt) {
            if (!this.auth.username) return this.$emit('login');

            if (fmt && this.auth.level === 'basic') {
                return this.$emit('perk');
            }

            this.external(`${window.location.origin}/api/job/${jobid}/output/source.geojson.gz?token=${localStorage.token}`);
        },
        collectionpls: function(c) {
            if (!this.auth.username) return this.loginModal = true;
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
                        _open: false,
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
        MustLogin,
        ArrowsMaximizeIcon,
        ArrowsMinimizeIcon,
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
        MapIcon,
        TablerInput,
        TablerToggle,
        TablerDropdown,
        TablerDelete,
        LayerIcon
    }
}
</script>
