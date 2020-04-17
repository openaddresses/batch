<template>
    <div class='col col--12 pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 pb12 fl'>Data:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use href='#icon-refresh'/></svg>
                </button>
                <button @click='showFilter = !showFilter' class='btn round btn--stroke fr color-gray mr12'>
                    <svg v-if='!showFilter' class='icon'><use href='#icon-search'/></svg>
                    <svg v-else class='icon'><use href='#icon-close'/></svg>
                </button>

                <template v-if='showFilter'>
                    <div class='col col--12 grid border border--gray px6 py6 round mb12 relative'>
                        <div class='absolute triangle--u triangle color-gray' style='top: -12px; right: 75px;'></div>

                        <div class='col col--8 px6'>
                            <label>Source</label>
                            <input v-model='filter.source' class='input' placeholder='/ca/nb/provincewide' />
                        </div>
                        <div class='col col--4 px6'>
                            <label>Layer</label>
                            <div class='w-full select-container'>
                                <select v-model='filter.layer' class='select'>
                                    <option>all</option>
                                    <option>addresses</option>
                                    <option>buildings</option>
                                    <option>parcels</option>
                                </select>
                                <div class='select-arrow'></div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>

            <div class='col col--12 pb12'>
                <Coverage/>
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
        <template v-else-if='!datas.length'>
            <div class='flex-parent flex-parent--center-main'>
                <div class='flex-child py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Data Found</div>
            <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
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
                        <span v-on:click.stop.prevent='datapls(d)' v-if='d.output.output' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>Download</span>
                        <span v-on:click.stop.prevent='emithistory(d)' class='fr mx6 bg-blue-faint bg-blue-on-hover color-white-on-hover color-blue inline-block px6 py3 round txt-xs txt-bold cursor-pointer'>History</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>

import Coverage from './Coverage.vue';

export default {
    name: 'Data',
    data: function() {
        return {
            loading: false,
            showFilter: false,
            filter: {
                source: '',
                layer: 'all'
            },
            datas: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    watch: {
        showFilter: function() {
            this.filter.source = '';
            this.filter.layer = 'all';
        },
        'filter.layer': function() {
            this.refresh();
        },
        'filter.source': function() {
            this.refresh();
        }
    },
    methods: {
        refresh: function() {
            this.getData();
        },
        emitjob: function(jobid) {
            this.$router.push({ path: `/job/${jobid}` })
        },
        emithistory: function(d) {
            this.$router.push({ path: `/data/${d.id}/history` })
        },
        datapls: function(d) {
            this.external(`${window.location.origin}/api/job/${d.job}/output/source.geojson.gz`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        getData: function() {
            this.loading = true;
            fetch(window.location.origin + `/api/data?source=${this.filter.source}&layer=${this.filter.layer}`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.datas = res;

                this.loading = false;
            });
        }
    },
    components: {
        Coverage
    }
}
</script>
