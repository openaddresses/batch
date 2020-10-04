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
    name: 'JobSample',
    props: ['job'],
    data: function() {
        return {
            data: []
        }
    },
    mounted: function() {
        this.getSample();
    },
    methods: {
        getSample: function() {

        }
    }
}
</script>
