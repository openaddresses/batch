<template>
    <div class='col col--12'>
        <div class='col col--12'>
            <h3 class='fl txt-h4 py6'>Source Stats</h3>

            <div class='flex-parent-inline fr'>
                <button @click='mode = "numeric"' :class='{ "btn--stroke": mode !== "numeric" }' class='btn btn--s btn--pill btn--pill-hl round mx0'>Numeric</button>
                <button @click='mode = "map"' :class='{ "btn--stroke": mode !== "map" }' class='btn btn--s btn--pill btn--pill-hr round mx0'>Map</button>
            </div>

            <template v-if='mode === "numeric"'>
                <table class='table'>
                    <thead><tr><th>Stat</th><th>Value</th></tr></thead>
                    <tbody>
                        <tr :key='key' v-for='(value, key) in flat'>
                            <td v-text='key'></td>
                            <td v-text='value'></td>
                        </tr>
                    </tbody>
                </table>
            </template>
            <template v-else-if='mode === "map"'>
                <JobStatsMap :job='job' @err='$emit("err", $event)'/>
            </template>
        </div>
    </div>
</template>

<script>
import JobStatsMap from './JobStatsMap.vue';

export default {
    name: 'JobStats',
    props: ['job'],
    data: function() {
        return {
            mode: 'numeric',
            flat: {}
        }
    },
    mounted: function() {
        this.calcTable();
    },
    methods: {
        calcTable() {
            for (const key of Object.keys(this.job.stats)) {
                if (typeof this.job.stats[key] === 'object') {
                    for (const key_i of Object.keys(this.job.stats[key])) {
                        this.$set(this.flat, `${key}::${key_i}`, this.job.stats[key][key_i]);
                    }
                } else {
                    this.$set(this.flat, key, this.job.stats[key]);
                }
            }
        }
    },
    components: {
        JobStatsMap
    }
}
</script>
