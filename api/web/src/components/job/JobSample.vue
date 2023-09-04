<template>
<div class='col-12'>
    <template v-if='job.output.preview'>
        <img class='round w-full' :src='`/api/job/${job.id}/output/source.png`'/>
    </template>
    <template v-else>
        <div class='border rounded'>
            <div class='d-flex justify-content-center my-4'>
                <InfoCircleIcon size='40'/>
            </div>

            <div class='text-center'>
                <h3 class=''>No Preview Image Found</h3>
            </div>
        </div>
    </template>

    <div class='col-12 py-4'>
        <h3 class='fl txt-h4'>Job Sample:</h3>

        <div class='flex-inline fr'>
            <button @click='mode = "props"' :class='{ "btn--stroke": mode !== "props" }' class='btn btn--s btn--pill btn--pill-hl round mx0'>Props</button>
            <button @click='mode = "raw"' :class='{ "btn--stroke": mode !== "raw" }' class='btn btn--s btn--pill btn--pill-hr round mx0'>Raw</button>
        </div>
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
    <template v-else-if='mode === "props"'>
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
    <template v-else-if='mode === "raw"'>
        <textarea class='col col--12' rows='24' v-text='sample.map(s => JSON.stringify(s)).join("\n")' :style='{
            "white-space": "pre",
            "overflow-wrap": "normal",
            "overflow-x": "scroll"
        }'/>
    </template>
</div>
</template>

<script>
import {
    InfoCircleIcon
} from 'vue-tabler-icons';

export default {
    name: 'JobSample',
    props: ['job'],
    data: function() {
        return {
            mode: 'props',
            loading: true,
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
                this.loading = true;
                const res = await window.std(`/api/job/${this.$route.params.jobid}/output/sample`);
                const props = {};
                for (const r of res) {
                    for (const key of Object.keys(r.properties)) {
                        props[key] = true;
                    }
                }

                this.props = Object.keys(props);
                this.sample = res;
                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        InfoCircleIcon
    }
}
</script>
