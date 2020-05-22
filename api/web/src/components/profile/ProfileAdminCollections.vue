<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>
                    <span class='bg-red-faint color-red round inline-block px6 py3 txt-xs txt-bold'>Admin</span>
                    Collections:
                </h2>

                <div class='fr'>
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
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <template v-if='newCollection.show'>
                <div class='col col--12 border border--gray-light round my12'>
                   <div class='col col--12 grid grid--gut12 pl12 py6'>
                        <div class='col col--12 pb6'>
                            <h2 class='txt-bold fl'>Create New Collection</h2>
                            <button @click='newCollection.show = false' class='fr btn round btn--s btn--stroke btn--gray'>
                                <svg class='icon'><use xlink:href='#icon-close'/></svg>
                            </button>
                        </div>

                        <div class='col col--12'>
                            <label>Collection Name</label>
                            <input v-model='newCollection.name' type='text' class='input' placeholder='Collection Name'/>
                        </div>

                        <div class='col col--10 py12'>
                            <input v-on:keyup.enter='addGlob' v-model='newCollection.source' type='text' class='input' placeholder='New Source'/>
                        </div>

                        <div class='col col--2 py12'>
                            <button @click='addGlob' class='btn btn--stroke round btn--gray w-full'>
                                <svg class='fl icon mt6'><use href='#icon-plus'/></svg> Glob
                            </button>
                        </div>

                        <div :key='source' v-for='(source, i) in newCollection.sources' class='col col--12'>
                            <div class='pre'>
                                <span v-text='source'/>
                                <svg @click='newCollection.sources.splice(i, 1)' class='cursor-pointer fr icon color-gray-light color-red-on-hover'><use href='#icon-trash'/></svg>
                            </div>
                        </div>

                        <div class='col col--12 clearfix'>
                            <div class='col col--2 fr'>
                                <button :disabled='newCollection.sources === 0' @click='setCollection' class='my12 w-full btn btn--stroke round color-gray color-green-on-hover'>
                                    <svg class='fl icon mt6'><use href='#icon-check'/></svg><span>Save</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </template>

            <div :key='collection.id' v-for='collection in collections' class='col col--12 grid'>
                <div @click='collection._open = !collection._open' class='col col--12 bg-gray-light-on-hover cursor-pointer px12 py12 round'>
                    <span v-text='collection.name'/>
                    <span class='fr bg-blue-faint color-blue round inline-block px6 py3 txt-xs txt-bold' v-text='collection.sources.length + " rules"'></span>
                </div>

                <div v-if='collection._open' class='col col-12 border border--gray-light round px12 py12 my6'>
                    <div :key='source' v-for='source in collection.sources' class='col col--12 pre' v-text='source'></div>
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
        },
        setCollection: function() {
            this.newCollection.name = this.newCollection.name.toLowerCase();

            if (!/^[a-z0-9-]+$/.test(this.newCollection.name)) {
                return this.$emit('err', new Error('Collection names may only contain a-z 0-9 and -'));
            }

            this.loading = true;

            const url = new URL(`${window.location.origin}/api/collections`);

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: this.newCollection.name,
                    sources: this.newCollection.sources
                })
            }).then((res) => {
                if (res.status !== 200 && res.message) {
                    throw new Error(res.message);
                } else if (res.status !== 200 && res.status !== 304) {
                    throw new Error('Failed to save collection');
                }

                this.refresh();
            }).catch((err) => {
                this.loading = false;
                this.$emit('err', err);
            });
        }
    }
}
</script>
