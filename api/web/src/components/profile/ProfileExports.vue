<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>Exports:</h2>

                <div class='fr'>
                    <button @click='refresh' class='btn round btn--stroke color-gray mx3'>
                        <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                    </button>
                </div>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else-if='!exps.length'>
            <div class='col col--12'>
                <div class='flex-parent flex-parent--center-main'>
                    <div class='flex-child py24'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                    </div>
                </div>
                <div class='w-full align-center'>You haven't created any exports yet</div>
            </div>
        </template>
        <template v-else>
            <div :key='exp.id' v-for='exp in exps' class='col col--12 grid bg-gray-light-on-hover cursor-default round py12'>
                <div @click='$router.push({ path: `/export/${exp.id}`})' class='col col--12 cursor-pointer'>
                     <Status :status='exp.status'/>
                    <span class='pl6' v-text='"Job #" + exp.job_id + " - " + exp.source_name + " - " + exp.layer + " - " + exp.name'/>
                    <span class='fr pr12' v-text='exp.format'/>
                </div>
            </div>
        </template>

        <Pager v-if='exps.length' @page='page = $event' :perpage='perpage' :total='total'/>
    </div>
</template>

<script>
import Pager from '../util/Pager.vue';
import Status from '../Status.vue';

export default {
    name: 'ProfileExports',
    props: [ ],
    data: function() {
        return {
            exps: [],
            page: 0,
            perpage: 2,
            total: 100,
            loading: false
        };
    },
    mounted: function() {
        this.refresh();
    },
    watch: {
        page: function() {
            this.getExports();
        },
    },
    methods: {
        refresh: function() {
            this.getExports();
        },
        getExports: function() {
            this.loading = true;

            const url = new URL(`${window.location.origin}/api/export`);
            url.searchParams.append('limit', this.perpage)
            url.searchParams.append('page', this.page)

            fetch(url, {
                method: 'GET',
                credentials: 'same-origin'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to load exports');
                }
                return res.json();
            }).then((res) => {
                this.exps = res.exports;
                this.total = res.total;

                this.loading = false;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    },
    components: {
        Pager,
        Status
    }
}
</script>
