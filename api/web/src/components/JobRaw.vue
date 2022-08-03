<template>
    <div class='col col--12'>
        <div class='col col--12 grid border-b border--gray-light bg-white pt12'>
            <div class='col col--12'>
                <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>

                <h2 class='txt-h4 ml12 pb12 fl'>Job #<span v-text='jobid'/></h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>

                <span v-if='raw.data' v-on:click.stop.prevent='external(job.sourcej)' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <BrandGithubIcon width="16" height="16"/>
                </span>

                <span v-if='job.source' v-on:click.stop.prevent='external(raw.data)' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <LinkIcon width="16" height="16"/>
                </span>

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
    BrandGithubIcon,
    LinkIcon
} from 'vue-tabler-icons';

export default {
    name: 'JobRaw',
    props: ['jobid'],
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
    mounted: function() {
        this.refresh();
    },
    methods: {
        refresh() {
            this.getJob();
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        getJob: async function() {
            try {
                this.loading.job = true;
                this.job = await window.std(`/api/job/${this.jobid}`);

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
        BrandGithubIcon,
        LinkIcon

    }
}
</script>
