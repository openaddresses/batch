<template>
    <div class='col col--12'>
        <div class='col col--12 grid border-b border--gray-light bg-white pt12'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>Job #<span v-text='$route.params.jobid'/></h2>

                <div class='ms-auto btn-list'>
                    <IconRefresh @click='refresh' class='cursor-pointer' size='32'/>
                    <IconBrandGithub @click='external(job.source)' class='cursor-pointer' size='32'/>
                    <IconLink v-if='job.source' @click='external(raw.data)' size='32'/>
                </div>
            </div>
        </div>

        <template v-if='loading.job || loading.raw'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else>
            <pre class='pre' v-text='JSON.stringify(raw, null, 4)'/>
        </template>

    </div>
</template>

<script>
import {
    IconRefresh,
    IconBrandGithub,
    IconLink
} from '@tabler/icons-vue';

export default {
    name: 'JobRaw',
    data: function () {
        return {
            loading: {
                job: true,
                raw: true
            },
            job: {},
            coverage: false,
            raw: false
        }
    },
    mounted: async function() {
        await this.refresh();
    },
    methods: {
        refresh: async function() {
            await this.getJob();
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        getJob: async function() {
            try {
                this.loading.job = true;
                this.job = await window.std(`/api/job/${this.$route.params.jobid}`);

                this.name = this.job.source
                    .replace(/.*sources\//, '')
                    .replace(/\.json/, '');

                this.loading.job = false;
                this.getRaw();
            } catch (err) {
                this.$emit('err', err);
            }
        },
        getRaw: async function() {
            try {
                this.loading.raw = true;
                const res = await window.std(`/api/job/${this.jobid}/raw`);
                for (const l of res.layers[this.job.layer]) {
                    if (l.name == this.job.name) this.raw = l;
                }

                this.coverage = res.coverage;
                this.loading.raw = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
    },
    components: {
        IconRefresh,
        IconBrandGithub,
        IconLink
    }
}
</script>
