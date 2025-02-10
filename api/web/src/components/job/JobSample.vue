<template>
    <div class='col-12'>
        <template v-if='job.output.preview'>
            <img
                class='round w-full'
                :src='local ? `http://localhost:4999/api/job/${job.id}/output/source.png` : `/api/job/${job.id}/output/source.png`'
            >
        </template>
        <template v-else>
            <div class='border rounded'>
                <div class='d-flex justify-content-center my-4'>
                    <IconInfoCircle size='40' />
                </div>

                <div class='text-center'>
                    <h3 class=''>
                        No Preview Image Found
                    </h3>
                </div>
            </div>
        </template>

        <div class='card-header'>
            <h3 class='card-title'>
                Job Sample
            </h3>

            <div class='ms-auto btn-list'>
                <button
                    v-if='mode !== "props"'
                    class='btn'
                    @click='mode = "props"'
                >
                    Table
                </button>
                <button
                    v-if='mode !== "raw"'
                    class='btn'
                    @click='mode = "raw"'
                >
                    Raw
                </button>
            </div>
        </div>


        <TablerLoading
            v-if='loading'
            desc='Loading Sample Data'
        />
        <TablerNone
            v-else-if='!sample.length'
            :create='false'
        />
        <template v-else-if='mode === "props"'>
            <table class='table table-hover table-vcenter card-table'>
                <thead>
                    <tr>
                        <th
                            v-for='key of props'
                            :key='key'
                            v-text='key'
                        />
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for='s of sample'
                        :key='s.properties.hash'
                    >
                        <th
                            v-for='key of props'
                            :key='s.properties.hash + ":" + key'
                            v-text='s.properties[key]'
                        />
                    </tr>
                </tbody>
            </table>
        </template>
        <template v-else-if='mode === "raw"'>
            <pre v-text='sample.map(s => JSON.stringify(s)).join("\n")' />
        </template>
    </div>
</template>

<script>
import {
    IconInfoCircle
} from '@tabler/icons-vue';
import {
    TablerLoading,
    TablerNone
} from '@tak-ps/vue-tabler';

export default {
    name: 'JobSample',
    components: {
        TablerLoading,
        TablerNone,
        IconInfoCircle
    },
    props: ['job'],
    data: function() {
        return {
            local: window.location.hostname === 'localhost',
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
    }
}
</script>
