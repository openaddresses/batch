<template>
    <div>
        <div class='page-wrapper'>
            <div class='page-header d-print-none'>
                <div class='container-xl'>
                    <div class='row g-2 align-items-center'>
                        <div class='col d-flex'>
                            <TablerBreadCrumb />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class='page-body'>
            <div class='container-xl'>
                <div class='row row-deck row-cards'>
                    <div class='col-12'>
                        <div class='card'>
                            <div class='card-header'>
                                <h3 class='card-title'>
                                    Source Health
                                </h3>
                                <div
                                    v-if='!loading'
                                    class='text-secondary mx-3'
                                    v-text='`${needsAttentionCount} of ${sources.length} sources need attention`'
                                />

                                <div class='ms-auto btn-list'>
                                    <TablerToggle
                                        v-model='showAll'
                                        label='Show all sources'
                                    />
                                    <IconRefresh
                                        class='cursor-pointer'
                                        size='32'
                                        title='Refresh health'
                                        @click='fetchHealth'
                                    />
                                </div>
                            </div>

                            <div class='card-body row'>
                                <div class='col-12 col-md-4'>
                                    <TablerInput
                                        v-model='search'
                                        label='Search'
                                        placeholder='Filter by source name'
                                    />
                                </div>
                            </div>

                            <TablerLoading
                                v-if='loading'
                                desc='Loading Health'
                            />
                            <TablerNone
                                v-else-if='!filtered.length'
                                label='Sources'
                                :create='false'
                            />
                            <table
                                v-else
                                class='table table-hover table-vcenter card-table'
                            >
                                <thead>
                                    <tr>
                                        <th>Source</th>
                                        <th
                                            v-for='layer in layers'
                                            :key='layer'
                                            class='text-center text-capitalize'
                                            v-text='layer'
                                        />
                                    </tr>
                                </thead>
                                <tbody>
                                    <template
                                        v-for='s in filtered'
                                        :key='s.source'
                                    >
                                        <tr
                                            class='cursor-pointer'
                                            @click='s._open = !s._open'
                                        >
                                            <td>
                                                <div class='d-flex align-items-center'>
                                                    <IconChevronRight
                                                        v-if='!s._open'
                                                        size='20'
                                                        stroke='1'
                                                    />
                                                    <IconChevronDown
                                                        v-else
                                                        size='20'
                                                        stroke='1'
                                                    />
                                                    <span v-text='s.source' />
                                                </div>
                                            </td>
                                            <td
                                                v-for='layer in layers'
                                                :key='layer'
                                                class='text-center'
                                            >
                                                <IconCheck
                                                    v-if='s.layers[layer] && s.layers[layer].state === "healthy"'
                                                    class='text-green'
                                                    size='24'
                                                    stroke='2'
                                                />
                                                <IconAlertTriangle
                                                    v-else-if='s.layers[layer] && s.layers[layer].state === "stale"'
                                                    class='text-yellow'
                                                    size='24'
                                                    stroke='2'
                                                />
                                                <IconX
                                                    v-else-if='s.layers[layer] && s.layers[layer].state === "never"'
                                                    class='text-red'
                                                    size='24'
                                                    stroke='2'
                                                />
                                            </td>
                                        </tr>
                                        <tr v-if='s._open'>
                                            <td :colspan='layers.length + 1'>
                                                <div
                                                    v-for='entry in entries(s)'
                                                    :key='`${entry.layer}-${entry.name}`'
                                                    class='row mx-2 cursor-pointer'
                                                    @click='emitjob(entry.job)'
                                                >
                                                    <div
                                                        class='col-5'
                                                        v-text='`${entry.layer} - ${entry.name}`'
                                                    />
                                                    <div
                                                        class='col-3'
                                                        v-text='fmt(entry.updated)'
                                                    />
                                                    <div
                                                        class='col-4 text-capitalize'
                                                        v-text='entry.state'
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import moment from 'moment-timezone';
import {
    IconRefresh,
    IconChevronRight,
    IconChevronDown,
    IconCheck,
    IconAlertTriangle,
    IconX
} from '@tabler/icons-vue';
import {
    TablerNone,
    TablerLoading,
    TablerBreadCrumb,
    TablerInput,
    TablerToggle
} from '@tak-ps/vue-tabler';
import { LAYERS, groupBySource } from '../util/health.js';

const STATE_ORDER = { never: 0, stale: 1, healthy: 2 };

export default {
    name: 'Health',
    components: {
        IconRefresh,
        IconChevronRight,
        IconChevronDown,
        IconCheck,
        IconAlertTriangle,
        IconX,
        TablerNone,
        TablerLoading,
        TablerBreadCrumb,
        TablerInput,
        TablerToggle
    },
    props: [ 'auth' ],
    data: function() {
        return {
            loading: true,
            showAll: false,
            search: '',
            layers: LAYERS,
            sources: []
        };
    },
    computed: {
        needsAttentionCount: function() {
            return this.sources.filter((s) => s.worst !== 'healthy').length;
        },
        filtered: function() {
            const term = this.search.trim().toLowerCase();
            let list = this.sources;

            if (!this.showAll) list = list.filter((s) => s.worst !== 'healthy');
            if (term) list = list.filter((s) => s.source.toLowerCase().includes(term));

            return [...list].sort((a, b) => {
                if (!this.showAll && STATE_ORDER[a.worst] !== STATE_ORDER[b.worst]) {
                    return STATE_ORDER[a.worst] - STATE_ORDER[b.worst];
                }

                return a.source.localeCompare(b.source);
            });
        }
    },
    mounted: async function() {
        await this.fetchHealth();
    },
    methods: {
        fmt: function(date) {
            return date ? moment(date).format('YYYY-MM-DD') : 'Never';
        },
        entries: function(source) {
            return Object.values(source.layers).flatMap((l) => l.entries);
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` });
        },
        fetchHealth: async function() {
            try {
                this.loading = true;

                const url = window.stdurl('/api/data');
                url.searchParams.set('failing', 'true');

                const res = await window.std(url);

                this.sources = groupBySource(res).map((s) => ({ ...s, _open: false }));

                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
};
</script>
