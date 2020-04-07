<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <button @click='close' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>

                <h2 class='txt-h4 ml12 pb12 fl'>DATA HISTORY TITLE</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
        </div>

        <div class='col col--12 pt12'>
            <h2 class='txt-h4 pb12 fl'>Job History:</h2>
        </div>

        <div class='col col--1'>
            Status
        </div>
        <div class='col col--4'>
            Job ID
        </div>
        <div class='col col--7'>
            Updated
        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div :key='job.id' v-for='job in history.jobs' class='col col--12 grid'>
                <div @click='emitjob(job.id)' class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--1'>
                        <template v-if='job.status === "Pending"'>
                            <svg class='icon ml12 color-yellow opacity50' style='height: 16px; margin-top: 2px;'><use xlink:href='#icon-circle'/></svg>
                        </template>
                        <template v-else-if='job.status === "Success"'>
                            <svg class='icon ml12 color-green opacity50' style='height: 16px; margin-top: 2px;'><use xlink:href='#icon-circle'/></svg>
                        </template>
                        <template v-else-if='job.status === "Fail"'>
                            <svg class='icon ml12 color-red opacity50' style='height: 16px; margin-top: 2px;'><use xlink:href='#icon-circle'/></svg>
                        </template>
                    </div>
                    <div class='col col--4'>
                        Job <span v-text='job.id'/>
                    </div>
                    <div class='col col--7'>
                        <span v-text='job.created'></span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'History',
    props: ['dataid'],
    data: function() {
        return {
            loading: false,
            history: {
                jobs: []
            }
        }
    },
    mounted: function() {
        this.refresh();

        window.location.hash = `data:${this.dataid}`
    },
    methods: {
        close: function() {
            this.$emit('close');
        },
        refresh: function() {
            this.getHistory();
        },
        getHistory: function() {
            this.loading = true;
            fetch(window.location.origin + `/api/data/${this.dataid}/history`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.history = res;
                this.loading = false;
            });
        }
    }
}
</script>
