<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 pb12 fl'>Runs</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>
            </div>
            <div class='col col--12 grid border-b border--gray-light'>
                <div class='col col--2'>
                    Status
                </div>
                <div class='col col--4'>
                    Run ID
                </div>
                <div class='col col--6'>
                    Attributes
                </div>
            </div>

        </div>

        <template v-if='loading'>
            <div class='flex-parent flex-parent--center-main w-full'>
                <div class='flex-child loading py24'></div>
            </div>
        </template>
        <template v-else>
            <div :key='run.id' v-for='run in runs' class='col col--12 grid'>
                <div class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--2 flex-parent flex-parent--center-main'>
                    </div>
                    <div class='col col--4'>
                        Run <span v-text='run.id'/>
                    </div>
                    <div class='col col--6 pr12'>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Runs',
    mounted: function() {
        window.location.hash = 'runs';
        this.refresh();
    },
    data: function() {
        return {
            loading: false,
            runs: []
        };
    },
    methods: {
        refresh: function() {
            this.getRuns();
        },
        getRuns: function() {
            this.loading = true;
            fetch(window.location.origin + '/api/run', {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.runs = res;
                this.loading = false;
            });
        }
    },
    components: {
    }
}
</script>
