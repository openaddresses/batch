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
                                <div class='col-12 col-md-4'>
                                    <label class='form-label'>Sort by</label>
                                    <select
                                        v-model='sortBy'
                                        class='form-select'
                                    >
                                        <option value='status'>
                                            Status (broken first)
                                        </option>
                                        <option value='oldest'>
                                            Oldest first
                                        </option>
                                        <option value='affected'>
                                            Most layers affected
                                        </option>
                                    </select>
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
                                    <tr
                                        v-for='s in filtered'
                                        :key='s.source'
                                    >
                                        <td v-text='s.source' />
                                        <td
                                            v-for='layer in layers'
                                            :key='layer'
                                            class='text-center'
                                        >
                                            <IconCheck
                                                v-if='s.layers[layer] && s.layers[layer].state === "healthy"'
                                                v-tooltip='cellTooltip(s, layer)'
                                                class='text-green cursor-pointer'
                                                size='24'
                                                stroke='2'
                                                @click='emitjob(cellJob(s, layer))'
                                            />
                                            <IconAlertTriangle
                                                v-else-if='s.layers[layer] && s.layers[layer].state === "stale"'
                                                v-tooltip='cellTooltip(s, layer)'
                                                class='text-yellow cursor-pointer'
                                                size='24'
                                                stroke='2'
                                                @click='emitjob(cellJob(s, layer))'
                                            />
                                            <IconX
                                                v-else-if='s.layers[layer] && s.layers[layer].state === "never"'
                                                v-tooltip='cellTooltip(s, layer)'
                                                class='text-red cursor-pointer'
                                                size='24'
                                                stroke='2'
                                                @click='emitjob(cellJob(s, layer))'
                                            />
                                        </td>
                                    </tr>
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
const STATE_LABELS = { healthy: 'Healthy', stale: 'Stale', never: 'Never succeeded' };

export default {
    name: 'Health',
    components: {
        IconRefresh,
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
            sortBy: 'status',
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

            return [...list].sort((a, b) => this.compare(a, b));
        }
    },
    mounted: async function() {
        await this.fetchHealth();
    },
    methods: {
        fmt: function(date) {
            return date ? moment(date).format('YYYY-MM-DD') : 'Never';
        },
        entryTooltip: function(entry) {
            const label = STATE_LABELS[entry.state];
            return entry.updated
                ? `${entry.name}: ${label} — updated ${this.fmt(entry.updated)}`
                : `${entry.name}: ${label}`;
        },
        cellTooltip: function(source, layer) {
            const cell = source.layers[layer];
            if (!cell) return '';
            return cell.entries.map((entry) => this.entryTooltip(entry)).join(' | ');
        },
        cellJob: function(source, layer) {
            const cell = source.layers[layer];
            if (!cell) return null;
            const worst = cell.entries.find((entry) => entry.state === cell.state);
            return (worst || cell.entries[0]).job;
        },
        affectedCount: function(source) {
            return Object.values(source.layers).filter((l) => l.state !== 'healthy').length;
        },
        oldestAgeDays: function(source) {
            // A finite sentinel (not Infinity) so two "never succeeded" sources
            // subtract to a real number in compare(), not NaN.
            const NEVER_AGE_DAYS = 1e6;
            const now = Date.now();
            let max = 0;

            for (const layer of Object.values(source.layers)) {
                for (const entry of layer.entries) {
                    const age = entry.updated ? (now - new Date(entry.updated).getTime()) / 86400000 : NEVER_AGE_DAYS;
                    if (age > max) max = age;
                }
            }

            return max;
        },
        compare: function(a, b) {
            if (this.sortBy === 'oldest') {
                const diff = this.oldestAgeDays(b) - this.oldestAgeDays(a);
                if (diff !== 0) return diff;
            } else if (this.sortBy === 'affected') {
                const diff = this.affectedCount(b) - this.affectedCount(a);
                if (diff !== 0) return diff;
            } else if (STATE_ORDER[a.worst] !== STATE_ORDER[b.worst]) {
                return STATE_ORDER[a.worst] - STATE_ORDER[b.worst];
            }

            return a.source.localeCompare(b.source);
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

                this.sources = groupBySource(res);

                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
};
</script>
