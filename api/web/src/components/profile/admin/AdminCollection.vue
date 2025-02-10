<template>
    <div class='card'>
        <div class='card-header d-flex'>
            <h2 class='card-title'>
                Collections
            </h2>

            <div class='ms-auto btn-list'>
                <IconPlus
                    class='cursor-pointer'
                    size='32'
                    @click='collections.splice(0, 0, {})'
                />
                <IconRefresh
                    class='cursor-pointer'
                    size='32'
                    @click='refresh'
                />
            </div>
        </div>

        <TablerLoading v-if='loading' />
        <template v-else>
            <table class='table table-vcenter card-table'>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Attributes</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for='collection in collections'>
                        <Collection
                            :collection='collection'
                            @refresh='refresh'
                        />
                    </template>
                </tbody>
            </table>
        </template>
    </div>
</template>

<script>
import Collection from './Collection.vue';
import {
    IconPlus,
    IconRefresh,
} from '@tabler/icons-vue';

import {
    TablerLoading
} from '@tak-ps/vue-tabler';

export default {
    name: 'AdminCollections',
    components: {
        TablerLoading,
        IconPlus,
        IconRefresh,
        Collection
    },
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
    }
}
</script>
