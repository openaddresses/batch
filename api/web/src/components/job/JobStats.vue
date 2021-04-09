<template>
    <div class='col col--12'>
        <template v-if='!job.stats || JSON.stringify(job.stats) === "{}"'>
            <div class='col col--12 border border--gray-light round'>
                <div class='flex-parent flex-parent--center-main pt36'>
                    <svg class='flex-child icon w60 h60 color-gray'><use href='#icon-info'/></svg>
                </div>

                <div class='flex-parent flex-parent--center-main pt12 pb36'>
                    <h1 class='flex-child txt-h4 cursor-default'>Job does not have stats</h1>
                </div>
            </div>
        </template>
        <template v-else>
            <table class='table'>
                <thead><tr><th>Stat</th><th>Job Value</th><th>Master Delta</th></tr></thead>
                <tbody>
                    <tr :key='key' v-for='(value, key) in flat'>
                        <td v-text='key'></td>
                        <td class='align-center' v-text='value'></td>
                        <template v-if='flat_delta[key] < 0'>
                            <td class='align-center color-red' v-text='flat_delta[key]'></td>
                        </template>
                        <template v-else-if='flat_delta[key] > 0'>
                            <td class='align-center color-green' v-text='"+" + flat_delta[key]'></td>
                        </template>
                        <template v-else>
                            <td class='align-center'>No Change</td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </template>
    </div>
</template>

<script>
export default {
    name: 'JobStats',
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
