<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 pb12 fl'>Exports:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>

            <div class='col col--1'>
                Status
            </div>
            <div class='col col--2'>
                Export ID
            </div>
            <div class='col col--7'>
                Export
            </div>
            <div class='col col--2'>
                Format
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else>
            <div :key='e.id' v-for='e in exports' class='col col--12 grid'>
                <div @click='emitexport(e.id)' class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--1'>
                        <Status :status='e.status'/>
                    </div>
                    <div class='col col--2'>
                        Export <span v-text='e.id'/>
                    </div>
                    <div class='col col--7'>
                        <span v-text='`${e.source_name} - ${e.layer} - ${e.name} - ${e.format}`'/>
                    </div>
                    <div class='col col--2'>
                        <span v-text='e.format'/>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import Status from './Status.vue';

export default {
    name: 'Exports',
    props: [ 'auth' ],
    mounted: function() {
        this.refresh();
    },
    data: function() {
        return {
            exports: [],
            loading: false
        };
    },
    components: {
        Status
    },
    methods: {
        emitexport: function(exportid) {
            this.$router.push({ path: `/export/${exportid}` });
        },
        refresh: function() {
            this.getExports();
        },
        getExports: async function() {
            try {
                this.loading = true;
                this.exports = (await window.std(window.location.origin + '/api/export')).exports;
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
