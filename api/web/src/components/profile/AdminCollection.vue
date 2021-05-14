<template>
    <div class='col col--12 grid py24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>
                    <span class='bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold'>Admin</span>
                    Collections:
                </h2>

                <div class='fr'>
                    <button class='btn round btn--stroke color-gray color-green-on-hover mx3'>
                        <svg class='icon'><use xlink:href='#icon-package'/></svg>
                    </button>
                    <button @click='newCollection.show = true' class='btn round btn--stroke color-gray color-green-on-hover mx3'>
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
                <Collection :collection='collection'/>
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
            collections: [],
            newCollection: {
                show: false,
                name: '',
                sources: [],
                source: ''
            }
        };
    },
    mounted: function() {
        this.refresh();
    },
    methods: {
        refresh: function() {
            this.newCollection.show = false;
            this.newCollection.name = '';
            this.newCollection.sources = [];
            this.newCollection.source = '';

            this.getCollections();
        },
        addGlob: function() {
            this.newCollection.sources.splice(0, 0, this.newCollection.source);
            this.newCollection.source = '';
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
        },
        setCollection: async function() {
            try {
                this.newCollection.name = this.newCollection.name.toLowerCase();

                if (!/^[a-z0-9-]+$/.test(this.newCollection.name)) {
                    return this.$emit('err', new Error('Collection names may only contain a-z 0-9 and -'));
                }

                this.loading = true;

                await window.std('/api/collections', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: this.newCollection.name,
                        sources: this.newCollection.sources
                    })
                });

                this.loading = false;
                this.refresh();
            } catch(err) {
                this.loading = false;
                this.$emit('err', err);
            }
        }
    },
    components: {
        Collection
    }
}
</script>
