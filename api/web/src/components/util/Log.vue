<template>
    <div>
        <TablerLoading v-if='loading' />
        <TablerAlert
            v-else-if='error'
            :err='error'
        />
        <TablerNone
            v-else-if='alert'
            :create='false'
            label='Log Yet Produced'
        />
        <pre v-else>
            <div
                v-for='line in lines'
                :key='line.id'
                class='cursor-pointer bg-darken10-on-hover'
                @click='linenum(line)'
                v-text='line.message'
            />
        </pre>
    </div>
</template>

<script>
import {
    TablerLoading,
    TablerAlert,
    TablerNone,
} from '@tak-ps/vue-tabler';

export default {
    name: 'Log',
    components: {
        TablerNone,
        TablerAlert,
        TablerLoading
    },
    props: ['logtype', 'id', 'collapse'],
    data: function() {
        return {
            loading: true,
            alert: false,
            error: undefined,
            lines: []
        };
    },
    mounted: async function() {
        await this.getLog();
    },
    methods: {
        downloadLog: async function() {
            window.open(`${window.location.origin}/api/${this.logtype}/${this.id}/log?dl=true&format=csv`, '_blank');
        },
        getLog: async function() {
            this.loading = true;
            this.error = undefined;
            try {
                this.lines = await window.std(`${window.location.origin}/api/${this.logtype}/${this.id}/log`);
            } catch(err) {
                if (err.message.match(/Job has not produced a log/)) {
                    this.alert = true;
                } else {
                    this.error = err;
                }
            }
            this.loading = false;
        },
        linenum: function(line) {
            window.location.hash = `${this.logtype}:${this.id}:log:${line.id}`
        }
    }
}
</script>
