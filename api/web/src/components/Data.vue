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

            <div class='col col--1'>
                Source
            </div>
            <div class='col col--2'>
                Updated
            </div>
            <div class='col col--4'>
                Job
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
