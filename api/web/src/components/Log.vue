<template>
    <div class='col col--12'>
        <div v-for='line in lines' :key='line.timestamp' v-text='line.message'></div>
    </div>
</template>

<script>
export default {
    name: 'Log',
    props: ['job'],
    data: function() {
        return {
            lines: []
        };
    },
    mounted: function() {
        this.getLog();
    },
    methods: {
        getLog: function() {
            fetch(`${window.location.origin}/api/job/${this.job}/log`, {
                method: 'GET'
            }).then((res) => {
                return res.json();
            }).then((res) => {
                this.lines = res;
            });
        }
    }
}
</script>
