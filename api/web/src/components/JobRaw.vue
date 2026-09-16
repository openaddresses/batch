<template>
    <div>
        <div class='page-wrapper'>
            <div class='page-header d-print-none'>
                <div class='container-xl'>
                    <div class='row g-2 align-items-center'>
                        <div class='col d-flex'>
                            <TablerBreadCrumb />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class='page-body'>
            <div class='container-xl'>
                <div class='row row-deck row-cards'>
                    <div class='col-12'>
                        <div class='card'>
                            <div class='card-header'>
                                <div class='card-title row'>
                                    <div class='d-flex'>
                                        <Status
                                            v-if='job.status'
                                            :status='job.status'
                                        />
                                        <div class='mx-2 align-self-center'>
                                            Job <span v-text='$route.params.jobid' /> Raw Source
                                        </div>
                                    </div>
                                    <div
                                        style='padding-left: 50px;'
                                        class='subheader'
                                        v-text='`${job.source_name} - ${job.layer} - ${job.name}`'
                                    />
                                </div>

                                <div class='ms-auto btn-list'>
                                    <TablerIconButton
                                        v-if='job.source'
                                        title='View source on GitHub'
                                        @click='external(job.source)'
                                    >
                                        <IconBrandGithub
                                            :size='32'
                                            stroke='1'
                                        />
                                    </TablerIconButton>
                                    <TablerIconButton
                                        v-if='raw && raw.data'
                                        title='Open source URL'
                                        @click='external(raw.data)'
                                    >
                                        <IconLink
                                            :size='32'
                                            stroke='1'
                                        />
                                    </TablerIconButton>
                                    <TablerIconButton
                                        title='Refresh'
                                        @click='refresh'
                                    >
                                        <IconRefresh
                                            :size='32'
                                            stroke='1'
                                        />
                                    </TablerIconButton>
                                </div>
                            </div>

                            <TablerLoading
                                v-if='loading'
                                :desc='`Loading Raw Source for Job ${$route.params.jobid}`'
                            />
                            <TablerAlert
                                v-else-if='error'
                                :err='error'
                            />
                            <TablerNone
                                v-else-if='!raw'
                                :create='false'
                                label='Matching Layer Not Found In Source'
                            />
                            <pre
                                v-else
                                v-text='JSON.stringify(raw, null, 4)'
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Status from './util/Status.vue'
import {
    TablerBreadCrumb,
    TablerLoading,
    TablerAlert,
    TablerNone,
    TablerIconButton
} from '@tak-ps/vue-tabler';
import {
    IconRefresh,
    IconBrandGithub,
    IconLink
} from '@tabler/icons-vue';

export default {
    name: 'JobRaw',
    components: {
        Status,
        TablerBreadCrumb,
        TablerLoading,
        TablerAlert,
        TablerNone,
        TablerIconButton,
        IconRefresh,
        IconBrandGithub,
        IconLink
    },
    data: function () {
        return {
            loading: true,
            error: undefined,
            job: {},
            raw: false
        }
    },
    mounted: async function() {
        await this.refresh();
    },
    methods: {
        refresh: async function() {
            try {
                this.error = undefined;
                this.loading = true;
                this.raw = false;

                this.job = await window.std(`/api/job/${this.$route.params.jobid}`);

                const res = await window.std(`/api/job/${this.$route.params.jobid}/raw`);
                for (const l of (res.layers && res.layers[this.job.layer]) || []) {
                    if (l.name === this.job.name) this.raw = l;
                }
            } catch (err) {
                this.error = err;
            }

            this.loading = false;
        },
        external: function(url) {
            window.open(url, "_blank");
        }
    }
}
</script>
