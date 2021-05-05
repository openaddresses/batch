<template>
    <div class='col col--12'>
        <div class='col col--12 grid border-b border--gray-light bg-white pt12' :class='scrollHeader'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>Task Log</h2>

                <button v-if='collapse' @click='isCollapsed = !isCollapsed' class='color-gray py6 px6'>
                    <svg v-if='!isCollapsed' class='icon'><use xlink:href='#icon-chevron-down'/></svg>
                    <svg v-else-if='isCollapsed' class='icon'><use xlink:href='#icon-chevron-right'/></svg>
                </button>

                <button v-if='!isCollapsed' @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>

        <template v-if='!isCollapsed'>
            <template v-if='loading'>
                <div class='flex-parent flex-parent--center-main w-full'>
                    <div class='flex-child loading py24'></div>
                </div>
            </template>
            <template v-else>
                <div class='col col--12 pre'>
                    <div @click='linenum(line)' v-for='line in lines' :key='line.id' v-text='line.message' class='cursor-pointer bg-darken10-on-hover'></div>
                </div>
            </template>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Log',
    props: ['logtype', 'id', 'collapse'],
    data: function() {
        return {
            scrolled: 0,
            isCollapsed: false,
            loading: false,
            lines: []
        };
    },
    mounted: function() {
        window.onscroll = () => {
             this.scrolled = window.scrollY;
        }

        this.refresh();
    },
    computed: {
        scrollHeader: function () {
            return {
                fixed: this.scrolled > 50,
                top: this.scrolled > 50
            }
        }
    },
    methods: {
        refresh: function() {
            this.getLog();
        },
        getLog: async function() {
            try {
                this.loading = true;
                this.lines = await window.std(`${window.location.origin}/api/${this.logtype}/${this.id}/log`);
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
        linenum: function(line) {
            window.location.hash = `${this.logtype}:${this.id}:log:${line.id}`
        }
    }
}
</script>
