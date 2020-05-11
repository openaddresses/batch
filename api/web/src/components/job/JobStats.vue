<template>
    <div class='col col--12'>
        <template v-if='!job.stats'>
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
                <thead><tr><th>Stat</th><th>Value</th></tr></thead>
                <tbody>
                    <tr :key='key' v-for='(value, key) in flat'>
                        <td v-text='key'></td>
                        <td v-text='value'></td>
                    </tr>
                </tbody>
            </table>
        </template>
    </div>
</template>

<script>
export default {
    name: 'JobStats',
    props: ['job'],
    data: function() {
        return {
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
    }
}
</script>
