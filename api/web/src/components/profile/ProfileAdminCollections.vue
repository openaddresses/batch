<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>
                    <span class='bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold'>Admin</span>
                    Collections:
                </h2>

                <div class='fr'>
                    <button @click='refresh' class='btn round btn--stroke color-gray color-green-on-hover mx3'>
                        <svg class='icon'><use xlink:href='#icon-plus'/></svg>
                    </button>
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
        <template v-else>
            <div :key='collection.id' v-for='collection in collections' class='col col--12 grid'>
                <div @click='collection._open = !collection._open' class='col col--12 bg-gray-light-on-hover cursor-pointer px12 py12 round'>
                    <span v-text='collection.name'/>
                    <span class='fr bg-blue-faint color-blue round inline-block px6 py3 txt-xs txt-bold' v-text='collection.sources.length + " rules"'></span>
                </div>

                <div v-if='collection._open' class='col col-12 border border--gray-light round px12 py12 my6'>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'ProfileAdminCollections',
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
        getCollections: function() {
            this.loading = true;

            const url = new URL(`${window.location.origin}/api/collections`);

            fetch(url, {
                method: 'GET'
            }).then((res) => {
                this.loading = false;

                if (res.status !== 200 && res.message) {
                    throw new Error(res.message);
                } else if (res.status !== 200 && res.status !== 304) {
                    throw new Error('Failed to load collections');
                }

                return res.json();
            }).then((res) => {
                this.collections = res.map((collection) => {
                    collection._open = false;
                    return collection;
                });
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
