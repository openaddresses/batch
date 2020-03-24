<template>
    <div class='col col--12 pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 pb12 fl'>Data:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
                <button @click='showFilter = !showFilter' class='btn round btn--stroke fr color-gray mr12'>
                    <svg class='icon'><use xlink:href='#icon-search'/></svg>
                </button>
            </div>

            <div class='col col--5'>
                Source
            </div>
            <div class='col col--2'>
                Updated
            </div>
            <div class='col col--5'>
                <span class='fr'>Attributes</span>
            </div>
        </div>
        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div :key='d.id' v-for='d in datas' class='col col--12 grid'>
                <div @click='emitjob(d.job)' class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--5'>
                        <span class='ml12' v-text='d.source'/>
                    </div>
                    <div class='col col--2'>
                        <span v-text='d.updated.match(/\d{4}-\d{2}-\d{2}/)[0]'/>
                    </div>
                    <div class='col col--5'>
                        <span @click='datapls(d)' v-if='d.output.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Data</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Data',
    data: function() {
        return {
            loading: false,
            showFilter: false,
            filter: '',
            datas: []
        };
    },
    mounted: function() {
        window.location.hash = 'data';
        this.refresh();
    },
    methods: {
        refresh: function() {
            this.getData();
        },
        emitjob: function(jobid) {
            this.$emit('job', jobid);
        },
        datapls: function(d) {
            this.external(`${window.location.origin}/api/job/${d.job}/output/source.geojson.gz`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        getData: function() {
            this.loading = true;
            fetch(window.location.origin + `/api/data`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.datas = res;

                this.loading = false;
            });
        }
    }
}
</script>
