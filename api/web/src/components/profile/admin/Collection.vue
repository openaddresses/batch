<template>
    <div class='col col--12 grid'>
        <div @click='open = !open' class='col col--12 bg-gray-light-on-hover cursor-pointer px12 py12 round'>
            <span v-text='name'/>

            <span class='fr bg-blue-faint color-blue round inline-block px6 py3 txt-xs txt-bold' v-text='sources.length + " rules"'></span>
        </div>

        <div v-if='open' class='col col-12 border border--gray-light round px12 py12 my6 relative grid'>
            <template v-if='!edit'>
                <div :key='source' v-for='source in sources' class='col col--12 pre' v-text='source'></div>

                <button @click='edit = true' class='color-gray color-blue-on-hover absolute top right pt24 pr24'>
                    <svg class='icon'><use xlink:href='#icon-pencil'/></svg>
                </button>
            </template>
            <template v-else>
                <div class='col col--12 pb6'>
                    <h2 class='txt-bold fl'>Edit Collection</h2>
                    <button @click='collection.id ? edit = false : $emit("refresh")' class='fr btn round btn--s btn--stroke btn--gray'>
                        <svg class='icon'><use xlink:href='#icon-close'/></svg>
                    </button>
                </div>

                <div class='col col--12'>
                    <label>Collection Name</label>
                    <input v-model='name' type='text' class='input' placeholder='Collection Name'/>
                </div>

                <div class='col col--10 py12'>
                    <input v-on:keyup.enter='addGlob' v-model='source' type='text' class='input' placeholder='New Source'/>
                </div>

                <div class='col col--2 py12'>
                    <button @click='addGlob' class='btn btn--stroke round btn--gray w-full'>
                        <svg class='fl icon mt6'><use href='#icon-plus'/></svg> Glob
                    </button>
                </div>

                <div :key='source' v-for='(source, i) in sources' class='col col--12'>
                    <div class='pre'>
                        <span v-text='source'/>
                        <svg @click='sources.splice(i, 1)' class='cursor-pointer fr icon color-gray-light color-red-on-hover'><use href='#icon-trash'/></svg>
                    </div>
                </div>

                <div class='col col--12 clearfix'>
                    <div class='col col--2 fr'>
                        <button :disabled='sources === 0' @click='setCollection' class='my12 w-full btn btn--stroke round color-gray color-green-on-hover'>
                            <svg class='fl icon mt6'><use href='#icon-check'/></svg><span>Save</span>
                        </button>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Collection',
    props: ['collection'],
    data: function() {
        return {
            edit: !this.collection.id,
            open: !this.collection.id,
            name: this.collection.name || '',
            source: '',
            sources: this.collection.sources ? JSON.parse(JSON.stringify(this.collection.sources)) : []
        };
    },
    methods: {
        addGlob: function() {
            this.sources.splice(0, 0, this.source);
            this.source = '';
        },
        setCollection: async function() {
            try {
                this.name = this.name.toLowerCase();

                if (!/^[a-z0-9-]+$/.test(this.name)) {
                    return this.$emit('err', new Error('Collection names may only contain a-z 0-9 and -'));
                }

                this.loading = true;

                if (this.collection.id) {
                    await window.std(`/api/collections/${this.collection.id}`, {
                        method: 'PATCH',
                        body: {
                            name: this.name,
                            sources: this.sources
                        }
                    });
                } else {
                    await window.std('/api/collections', {
                        method: 'POST',
                        body: {
                            name: this.name,
                            sources: this.sources
                        }
                    });
                }

                this.$emit('refresh');
            } catch(err) {
                this.$emit('err', err);
            }
        }
    }
}
</script>
