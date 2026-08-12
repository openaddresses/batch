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
                                        <option value='name'>
                                            Name (A-Z)
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
                            <div v-else>
                                <table class='table table-hover table-vcenter card-table health-header-table'>
                                    <colgroup>
                                        <col class='health-source-col'>
                                        <col
                                            v-for='layer in layers'
                                            :key='layer'
                                        >
                                    </colgroup>
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
                                </table>
                                <div
                                    v-bind='containerProps'
                                    class='health-scroll'
                                    :style='needsScroll ? undefined : { overflowY: "visible", maxHeight: "none" }'
                                >
                                    <div v-bind='wrapperProps'>
                                        <table class='table table-hover table-vcenter card-table health-body-table'>
                                            <colgroup>
                                                <col class='health-source-col'>
                                                <col
                                                    v-for='layer in layers'
                                                    :key='layer'
                                                >
                                            </colgroup>
                                            <tbody>
                                                <tr
                                                    v-for='{ data: s } in list'
                                                    :key='s.source'
                                                    class='health-row'
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
            </div>
        </div>
    </div>
</template>

<script>
import moment from 'moment-timezone';
import { computed, ref } from 'vue';
import { useVirtualList } from '@vueuse/core';
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
const ROW_HEIGHT = 57;
const MAX_SCROLL_HEIGHT = 640;

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
    setup: function() {
        const loading = ref(true);
        const showAll = ref(false);
        const search = ref('');
        const sortBy = ref('status');
        const sources = ref([]);

        const needsAttentionCount = computed(() => {
            return sources.value.filter((s) => s.worst !== 'healthy').length;
        });

        const affectedCount = function(source) {
            return Object.values(source.layers).filter((l) => l.state !== 'healthy').length;
        };

        const oldestAgeDays = function(source) {
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
        };

        const compare = function(a, b) {
            if (sortBy.value === 'name') {
                return a.source.localeCompare(b.source);
            } else if (sortBy.value === 'oldest') {
                const diff = oldestAgeDays(b) - oldestAgeDays(a);
                if (diff !== 0) return diff;
            } else if (sortBy.value === 'affected') {
                const diff = affectedCount(b) - affectedCount(a);
                if (diff !== 0) return diff;
            } else if (STATE_ORDER[a.worst] !== STATE_ORDER[b.worst]) {
                return STATE_ORDER[a.worst] - STATE_ORDER[b.worst];
            }

            return a.source.localeCompare(b.source);
        };

        const filtered = computed(() => {
            const term = search.value.trim().toLowerCase();
            let list = sources.value;

            if (!showAll.value) list = list.filter((s) => s.worst !== 'healthy');
            if (term) list = list.filter((s) => s.source.toLowerCase().includes(term));

            return [...list].sort(compare);
        });

        const needsScroll = computed(() => filtered.value.length * ROW_HEIGHT > MAX_SCROLL_HEIGHT);

        const { list, containerProps, wrapperProps } = useVirtualList(filtered, {
            itemHeight: ROW_HEIGHT,
            overscan: 10
        });

        return {
            loading,
            showAll,
            search,
            sortBy,
            sources,
            needsAttentionCount,
            filtered,
            needsScroll,
            list,
            containerProps,
            wrapperProps
        };
    },
    data: function() {
        return {
            layers: LAYERS
        };
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

<style scoped>
.health-header-table,
.health-body-table {
    table-layout: fixed;
    margin-bottom: 0;
}
.health-header-table {
    margin-bottom: -1px;
}
.health-source-col {
    width: 40%;
}
.health-scroll {
    max-height: 70vh;
    overflow-y: auto;
}
.health-row {
    height: 57px;
}
</style>
