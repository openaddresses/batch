<template>
<div class='col col--12 grid pt12'>
    <template v-if='job.output.preview'>
        <img class='round w-full' :src='`/api/job/${job.id}/output/source.png`'/>
    </template>
    <template v-else>
        <div class='col col--12 border border--gray-light round'>
            <div class='flex flex--center-main pt36'>
                <svg class='icon w60 h60 color-gray'><use href='#icon-info'/></svg>
            </div>

            <div class='flex flex--center-main pt12 pb36'>
                <h1 class='txt-h4 cursor-default'>No Preview Image Found</h1>
            </div>
        </div>
    </template>

    <div class='col col--12 py6'>
        <h3 class='fl txt-h4'>Job Sample:</h3>

        <label class='fr switch-container mt3'>
            Show Raw
            <input v-model='raw' type='checkbox' />
            <div class='switch switch--blue ml6'></div>
        </label>
    </div>


    <template v-if='loading'>
        <div class='flex flex--center-main w-full py24'>
            <div class='loading'></div>
        </div>
    </template>
    <template v-else-if='!sample.length'>
        <div class='col col--12 flex flex--center-main pt12 pb36'>
            <h1 class='txt-h4 cursor-default'>File is empty</h1>
        </div>
    </template>
    <template v-else-if='!raw'>
        <table class='table txt-xs mb60'>
            <thead>
                <tr>
                    <th :key='key' v-for='key of props' v-text='key'></th>
                </tr>
            </thead>
            <tbody>
                <tr :key='s.properties.hash' v-for='s of sample'>
                    <th :key='s.properties.hash + ":" + key' v-for='key of props' v-text='s.properties[key]'></th>
                </tr>
            </tbody>
        </table>
    </template>
    <template v-else-if='raw'>
        <textarea class='col col--12' rows='24' v-text='sample.map(s => JSON.stringify(s)).join("\n")' :style='{
            "white-space": "pre",
            "overflow-wrap": "normal",
            "overflow-x": "scroll"
        }'/>
    </template>
</div>
</template>

<script>

export default {
    name: 'JobSample',
    props: ['job'],
    data: function() {
        return {
            loading: false,
            raw: false,
            props: [],
            sample: [],
        };
    },
    mounted: function() {
        this.getSample();
    },
    methods: {
        getSample: async function() {
            try {
                const res = await window.std(`/api/job/${this.job.id}/output/sample`);
                const props = {};
                for (const r of res) {
                    for (const key of Object.keys(r.properties)) {
                        props[key] = true;
                    }
                }

                this.props = Object.keys(props);
                this.sample = res;
            } catch (err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
