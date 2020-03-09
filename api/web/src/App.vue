<template>
    <div id='app' class='col col--12'>
        <div class='col col--12 px12 py12 border-b'>
            <button @click='external("https://openaddresses.io")' class='btn btn--stroke round mr12'>Home</button>
            <button @click='mode = "data"' class='btn btn--stroke round mr12'>Data</button>
            <button @click='mode = "runs"' class='btn btn--stroke round mr12'>Runs</button>
            <button @click='mode = "jobs"' class='btn btn--stroke round mr12'>Jobs</button>
        </div>

        <div class='col col--12'>
            <template v-if='mode === "data"'>
                <Data/>
            </template>
            <template v-else-if='mode === "runs"'>
                <Runs/>
            </template>
            <template v-else-if='mode === "jobs"'>
                <Jobs/>
            </template>
        </div>
    </div>
</template>

<script>
import Data from './components/Data.vue';
import Runs from './components/Runs.vue';
import Jobs from './components/Jobs.vue';

export default {
    name: 'OpenAddresses',
    data: function() {
        return {
            mode: 'data'
        };
    },
    components: {
        Data,
        Runs,
        Jobs
    },
    methods: {
        external: function(url) {
            window.location.href = url;
        }
    }
}
</script>
