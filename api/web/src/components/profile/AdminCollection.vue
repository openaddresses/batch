<template>
    <div class='col col--12 grid py24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>
                    <span class='bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold'>Admin</span>
                    Collections:
                </h2>

                <div class='fr'>
                    <button @click='collections.splice(0, 0, {})' class='btn round btn--stroke color-gray color-green-on-hover mx3'>
                        <svg class='icon'><use xlink:href='#icon-plus'/></svg>
                    </button>
                    <button @click='refresh' class='btn round btn--stroke color-gray mx3'>
                        <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                    </button>
                </div>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else>
            <div :key='collection.id' v-for='collection in collections' class='col col--12 grid'>
                <Collection @refresh='refresh' :collection='collection'/>
            </div>
        </template>
    </div>
</template>

<script>

import Collection from './Collection.vue';

export default {
    name: 'AdminCollections',
    props: [ ],
    data: function() {
        return {
            loading: false,
            collections: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    methods: {
        refresh: function() {
            this.getCollections();
        },
        getCollections: async function() {
            try {
                this.loading = true;

                const res = await window.std('/api/collections');
                this.collections = res.map((collection) => {
                    collection._open = false;
                    return collection;
                });

                this.loading = false;
            } catch (err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        Collection
    }
}
</script>
