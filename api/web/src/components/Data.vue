<template>
    <div class='page-body'>
        <div class='container-xl'>
            <div class='row row-deck row-cards'>
                <div class='col-12'>
                    <div class='card'>
                        <div class='card-header'>
                            <h3 class='card-title'>
                                New Features
                            </h3>
                        </div>
                        <div class='card-body row'>
                            <div class='col-4 d-flex justify-content-center align-items-center'>
                                <LayerIcon
                                    layer='buildings'
                                    size='32'
                                    stroke='1'
                                />
                                Buildings
                            </div>
                            <div class='col-4 d-flex justify-content-center align-items-center'>
                                <LayerIcon
                                    layer='addresses'
                                    size='32'
                                    stroke='1'
                                />
                                Addresses
                            </div>
                            <div class='col-4 d-flex justify-content-center align-items-center'>
                                <LayerIcon
                                    layer='parcels'
                                    size='32'
                                    stroke='1'
                                />
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
                            <h2 class='card-title'>
                                Data Collections
                            </h2>

                            <div class='ms-auto btn-list'>
                                <IconRefresh
                                    class='cursor-pointer'
                                    size='32'
                                    stroke='1'
                                    @click='fetchCollections'
                                />
                            </div>
                        </div>

                        <TablerLoading
                            v-if='loading.collections'
                            desc='Loading Collections'
                        />
                        <table
                            v-else
                            class='table table-hover table-vcenter card-table'
                        >
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Updated</th>
                                    <th>Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for='c in collections'
                                    :key='c.id'
                                >
                                    <td v-text='c.human' />
                                    <td v-text='fmt(c.created)' />
                                    <td class='d-flex align-items-center'>
                                        <span v-text='size(c.size)' />
                                        <div class='ms-auto btn-list'>
                                            <IconDownload
                                                class='cursor-pointer'
                                                size='32'
                                                stroke='1'
                                                @click.stop.prevent='collectionpls(c)'
                                            />
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
                            <h2 class='card-title'>
                                Individual Sources
                            </h2>

                            <div class='ms-auto btn-list'>
                                <IconArrowsMaximize
                                    v-if='!fullscreen'
                                    class='cursor-pointer'
                                    size='32'
                                    stroke='1'
                                    @click='fullscreen = true'
                                />
                                <IconArrowsMinimize
                                    v-else
                                    class='cursor-pointer'
                                    size='32'
                                    stroke='1'
                                    @click='fullscreen = false'
                                />

                                <IconSearch
                                    v-if='!showFilter'
                                    class='cursor-pointer'
                                    size='32'
                                    stroke='1'
                                    @click='showFilter = !showFilter'
                                />
                                <IconX
                                    v-else
                                    class='cursor-pointer'
                                    size='32'
                                    stroke='1'
                                    @click='showFilter = !showFilter'
                                />

                                <IconRefresh
                                    class='cursor-pointer'
                                    size='32'
                                    stroke='1'
                                    @click='fetchData'
                                />
                            </div>
                        </div>

                        <template v-if='showFilter'>
                            <div class='card-body row'>
                                <div class='col col--9 px6'>
                                    <QuerySource
                                        show-validated='true'
                                        @source='filter.source = $event'
                                        @validated='filter.validated = $event'
                                    />
                                </div>
                                <div class='col col--3 px6'>
                                    <QueryLayer @layer='filter.layer = $event' />
                                </div>
                                <div class='col col--6 px6'>
                                    <TablerInput
                                        v-model='filter.before'
                                        :disabled='!filter.switches.before'
                                        label='Before'
                                        type='date'
                                    >
                                        <TablerToggle
                                            v-model='filter.switches.before'
                                            label='Before Enabled'
                                        />
                                    </TablerInput>
                                </div>
                                <div class='col col--6 px6'>
                                    <TablerInput
                                        v-model='filter.after'
                                        :disabled='!filter.switches.after'
                                        label='After'
                                        type='date'
                                    >
                                        <TablerToggle
                                            v-model='filter.switches.after'
                                            label='After Enabled'
                                        />
                                    </TablerInput>
                                </div>
                            </div>
                        </template>

                        <Coverage
                            :fullscreen='fullscreen'
                            :layer='filter.layer'
                            @err='$emit("err", $event)'
                            @point='filter.point = $event'
                        />

                        <div
                            v-if='loading.sources'
                            class='card-body'
                        >
                            <TablerLoading
                                desc='Loading Sources'
                            />
                        </div>
                        <template v-else>
                            <table class='table table-hover table-vcenter card-table'>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Layers</th>
                                        <th>Attributes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template
                                        v-for='d in datas'
                                        :key='d.source'
                                    >
                                        <tr>
                                            <td
                                                class='cursor-pointer'
                                                @click='d._open = !d._open'
                                                v-text='d.source'
                                            />
                                            <td
                                                class='cursor-pointer'
                                                @click='d._open = !d._open'
                                            >
                                                <LayerIcon
                                                    v-if='d.has.buildings'
                                                    layer='buildings'
                                                    size='32'
                                                    stroke='1'
                                                />
                                                <LayerIcon
                                                    v-if='d.has.addresses'
                                                    layer='addresses'
                                                    size='32'
                                                    stroke='1'
                                                />
                                                <LayerIcon
                                                    v-if='d.has.parcels'
                                                    layer='parcels'
                                                    size='32'
                                                    stroke='1'
                                                />
                                            </td>
                                            <td>
                                                <div class='d-flex'>
                                                    <div class='ms-auto btn-list'>
                                                        <IconMap
                                                            v-if='d.map'
                                                            class='cursor-pointer'
                                                            size='32'
                                                            stroke='1'
                                                            @click='$router.push(`/location/${d.map}`)'
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        <template
                                            v-for='job in d.sources'
                                            v-if='d._open'
                                            :key='job.id'
                                        >
                                            <tr
                                                class='bg-gray-50'
                                            >
                                                <td
                                                    colspan='3'
                                                    class='cursor-pointer'
                                                >
                                                    <div class='row mx-2'>
                                                        <div
                                                            class='col-5 d-flex align-items-center'
                                                            @click='emitjob(job.job)'
                                                        >
                                                            <span v-text='job.layer' />&nbsp;-&nbsp;<span v-text='job.name' />
                                                        </div>
                                                        <div
                                                            class='col-2 d-flex align-items-center'
                                                            @click='emitjob(job.job)'
                                                        >
                                                            <span v-text='fmt(job.updated)' />
                                                        </div>
                                                        <div class='col-5 d-flex'>
                                                            <div class='ms-auto btn-list'>
                                                                <Download
                                                                    :auth='auth'
                                                                    :job='job'
                                                                    @login='$emit("login")'
                                                                    @perk='$emit("perk", $event)'
                                                                />

                                                                <template v-if='auth && auth.access === "admin"'>
                                                                    <TablerDropdown>
                                                                        <slot>
                                                                            <IconSettings
                                                                                class='cursor-pointer'
                                                                                size='32'
                                                                                stroke='1'
                                                                            />
                                                                        </slot>
                                                                        <template #dropdown>
                                                                            <TablerToggle
                                                                                v-model='job.fabric'
                                                                                label='Fabric'
                                                                                @change='updateData(job)'
                                                                            />
                                                                            <TablerDelete @delete='deleteData(job)' />
                                                                        </template>
                                                                    </TablerDropdown>
                                                                </template>

                                                                <IconHistory
                                                                    class='cursor-pointer'
                                                                    size='32'
                                                                    stroke='1'
                                                                    @click='$router.push(`/data/${job.id}/history`)'
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </template>
                                    </template>
                                </tbody>
                            </table>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <MustLogin
            v-if='loginModal === true'
            @close='loginModal = false'
        />
    </div>
</template>

<script>
import LayerIcon from './util/LayerIcon.vue';
import MustLogin from './util/MustLogin.vue';
import Download from './util/Download.vue';
import Coverage from './util/Coverage.vue';
import QuerySource from './query/Source.vue';
import QueryLayer from './query/Layer.vue';
import moment from 'moment-timezone';
import {
    IconArrowsMaximize,
    IconArrowsMinimize,
    IconSettings,
    IconDownload,
    IconHistory,
    IconRefresh,
    IconSearch,
    IconMap,
    IconX,
} from '@tabler/icons-vue';
import {
    TablerLoading,
    TablerDropdown,
    TablerToggle,
    TablerDelete,
    TablerInput
} from '@tak-ps/vue-tabler';

export default {
    name: 'OAData',
    components: {
        MustLogin,
        IconArrowsMaximize,
        IconArrowsMinimize,
        IconSettings,
        IconDownload,
        IconHistory,
        IconRefresh,
        IconSearch,
        IconMap,
        IconX,
        Coverage,
        QuerySource,
        QueryLayer,
        Download,
        TablerLoading,
        TablerInput,
        TablerToggle,
        TablerDropdown,
        TablerDelete,
        LayerIcon
    },
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
    mounted: function() {
        this.fetchCollections();
        this.fetchData();
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
    }
}
</script>
