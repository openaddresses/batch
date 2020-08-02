<template>
    <div class='col col--12'>
        <div class='col col--12 grid border-b border--gray-light bg-white pt12' :class='scrollHeader'>
            <div class='col col--12'>
                <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>
                <h2 class='txt-h4 ml12 pb12 fl'>Job #<span v-text='jobid'/>: Log:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div class='col col--12'>
                <div @click='linenum(line)' v-for='line in lines' :key='line.id' v-text='line.message' class='cursor-pointer bg-darken10-on-hover'></div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Log',
    props: ['jobid'],
    data: function() {
        return {
            scrolled: 0,
            loading: false,
            lines: []
        };
    },
    mounted: function() {
        window.onscroll = (e) => {
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
        getLog: function() {
            this.loading = true;
            fetch(`${window.location.origin}/api/job/${this.jobid}/log`, {
                method: 'GET'
            }).then((res) => {
                this.loading = false;

                if (!res.ok && res.status !== 304 && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get logs');
                }

                return res.json();
            }).then((res) => {

                this.lines = res;
            }).catch((err) => {
                this.$emit('err', err);
            });
        },
        linenum: function(line) {
            window.location.hash = `jobs:${this.jobid}:log:${line.id}`
        }
    }
}
</script>
