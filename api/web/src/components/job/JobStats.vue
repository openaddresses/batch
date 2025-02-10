<template>
    <div class='col-12'>
        <TablerNone
            v-if='!job.stats || JSON.stringify(job.stats) === "{}"'
            label='Job Stats'
            :create='false'
        />
        <template v-else>
            <table class='table'>
                <thead><tr><th>Stat</th><th>Job Value</th><th>Master Delta</th></tr></thead>
                <tbody>
                    <tr
                        v-for='(value, key) in flat'
                        :key='key'
                    >
                        <td v-text='key' />
                        <td
                            class='align-center'
                            v-text='value'
                        />
                        <template v-if='flat_delta[key] < 0'>
                            <td
                                class='align-center color-red'
                                v-text='flat_delta[key]'
                            />
                        </template>
                        <template v-else-if='flat_delta[key] > 0'>
                            <td
                                class='align-center color-green'
                                v-text='"+" + flat_delta[key]'
                            />
                        </template>
                        <template v-else>
                            <td class='align-center'>
                                No Change
                            </td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </template>
    </div>
</template>

<script>
import {
    TablerNone
} from '@tak-ps/vue-tabler';

export default {
    name: 'JobStats',
    components: {
        TablerNone
    },
    props: ['job', 'delta'],
    data: function() {
        return {
            flat: {},
            flat_delta: {}
        }
    },
    mounted: function() {
        this.calcTable();
    },
    methods: {
        calcTable() {
            this.flat.count = this.job.count;
return

            function recurse(self, container, stats, pre = '') {
                for (const key of Object.keys(stats)) {
                    if (stats[key] !== null && stats[key] !== undefined && typeof stats[key] === 'object') {
                        recurse(self, container, stats[key], pre ? pre + '::' + key : key);
                    } else if (stats[key] !== null && stats[key] !== undefined) {
                        self.$set(container, pre ? pre + '::' + key : key, stats[key]);
                    }
                }
            }

            recurse(this, this.flat, this.job.stats)

            if (this.delta) {
                this.$set(this.flat_delta, 'count', this.delta.delta.count);

                recurse(this, this.flat_delta, this.delta.delta.stats)
            }

            for (const key of Object.keys(this.flat)) {
                if (this.flat_delta[key] === undefined) {
                    this.flat_delta[key] = '?';
                }
            }
        }
    }
}
</script>
