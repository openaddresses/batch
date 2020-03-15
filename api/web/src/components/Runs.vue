<template>
    <div class='col col--12 grid pt12'>
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
            <template v-if='run.expand'>
            </template>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Runs',
    mounted: function() {
        window.location.hash = 'runs';
        this.getRuns();
    },
    data: function() {
        return {
            runs: []
        };
    },
    methods: {
        getRuns: function() {
            fetch(window.location.origin + '/api/run', {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.runs = res.map((r) => {
                    r.expand = false;
                    return r;
                });
            });
        }
    },
    components: {
    }
}
</script>
