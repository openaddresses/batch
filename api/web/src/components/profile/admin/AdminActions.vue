<template>
    <div class='col col--12 grid'>
        <div class='col col--4'>
            <button :disabled='!unlocked || done.fabric' @click='fabric' class='btn btn--stroke round' :class='{
                "color-gray": !done.fabric,
                "color-green": done.fabric
            }'>
                Refresh Fabric

                <div v-if='loading.fabric' class='loading loading--s ml12 mt3 fr'></div>
                <div v-else-if='done.fabric' class='ml12 fr mt6'><svg class='icon'><use xlink:href='#icon-check'/></svg></div>
            </button>
        </div>
        <div class='col col--4'>
            <button :disabled='!unlocked || done.cache' @click='clear' class='btn btn--stroke round' :class='{
                "color-gray": !done.cache,
                "color-green": done.cache
            }'>
                Clear Cache
                <div v-if='loading.cache' class='loading loading--s ml12 mt3 fr'></div>
                <div v-else-if='done.cache' class='ml12 fr mt6'><svg class='icon'><use xlink:href='#icon-check'/></svg></div>
            </button>
        </div>
        <div class='col col--4'>
            <button :disabled='!unlocked || done.collections' @click='collections' class='btn btn--stroke round' :class='{
                "color-gray": !done.collections,
                "color-green": done.collections
            }'>
                Refresh Collections
                <div v-if='loading.collections' class='loading loading--s ml12 mt3 fr'></div>
                <div v-else-if='done.collections' class='ml12 fr mt6'><svg class='icon'><use xlink:href='#icon-check'/></svg></div>
            </button>
        </div>

        <div class='col col--12 clearfix mt6'>
            <label class='switch-container fr'>
                <p class='mr12'>Unlock Actions</p>
                <input type='checkbox' v-model='unlocked'/>
                <div class='switch switch--gray'></div>
            </label>
        </div>
    </div>
</template>

<script>
export default {
    name: 'AdminActions',
    props: [ ],
    data: function() {
        return {
            unlocked: false,
            loading: {
                fabric: false,
                cache: false,
                collections: false
            },
            done: {
                fabric: false,
                cache: false,
                collections: false
            }
        };
    },
    methods: {
        collections: async function() {
            this.loading.collections = true;
            try {
                await window.std(`/api/schedule`, {
                    method: 'POST',
                    body: {
                        type: 'collect'
                    }
                });
                this.done.collections = true;
            } catch (err) {
                this.$emit('err', err);
            }
            this.loading.collections = false;
        },
        clear: async function() {
            this.loading.cache = true;
            try {
                await window.std(`/api/cache`, {
                    method: 'DELETE'
                });
                this.done.cache = true;
            } catch (err) {
                this.$emit('err', err);
            }
            this.loading.cache = false;
        },
        fabric: async function() {
            this.loading.fabric = true;
            try {
                await window.std(`/api/schedule`, {
                    method: 'POST',
                    body: {
                        type: 'fabric'
                    }
                });
                this.done.fabric = true;
            } catch (err) {
                this.$emit('err', err);
            }
            this.loading.fabric = false;
        }
    }
}
</script>
