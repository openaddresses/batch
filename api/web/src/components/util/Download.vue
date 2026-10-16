<template>
    <TablerDropdown
        v-if='job.output.output'
        @click.stop.prevent=''
    >
        <slot>
            <TablerIconButton
                title='Download data'
            >
                <IconDownload
                    :size='32'
                    stroke='1'
                />
            </TablerIconButton>
        </slot>

        <template #dropdown>
            <div class='px-3 py-2'>
                <div class='fw-bold'>
                    Base
                </div>
                <div
                    v-for='f in formats'
                    :key='f.fmt'
                    class='d-flex align-items-center py-1'
                >
                    <span>{{ f.name }}</span>
                    <TablerIconButton
                        :title='`About ${f.name} format`'
                        @click.stop='external(f.url)'
                    >
                        <IconInfoCircle
                            :size='16'
                            stroke='1'
                        />
                    </TablerIconButton>
                    <a
                        class='ms-auto cursor-pointer'
                        @click.stop='datapls(job.job || job.id, f.fmt)'
                        v-text='f.fmt === "geojson" ? "download" : "request"'
                    />
                </div>

                <div class='fw-bold mt-2'>
                    Validated
                </div>
                <div class='d-flex align-items-center py-1'>
                    <span>GeoJSON+LD</span>
                    <TablerIconButton
                        title='About GeoJSON+LD format'
                        @click.stop='external(formats[0].url)'
                    >
                        <IconInfoCircle
                            :size='16'
                            stroke='1'
                        />
                    </TablerIconButton>
                    <span
                        v-if='!job.output.validated'
                        class='ms-auto text-muted'
                    >unavailable</span>
                    <span
                        v-else-if='auth.level !== "sponsor"'
                        class='ms-auto text-muted'
                    >sponsor benefit</span>
                    <a
                        v-else
                        class='ms-auto cursor-pointer'
                        @click.stop='datapls(job.job || job.id, "geojson", true)'
                    >download</a>
                </div>
            </div>
        </template>

        <MustLogin
            v-if='loginModal === true'
            @close='loginModal = false'
        />
    </TablerDropdown>
</template>

<script>
import {
    IconInfoCircle,
    IconDownload
} from '@tabler/icons-vue';
import MustLogin from './MustLogin.vue';
import {
    TablerDropdown,
    TablerIconButton
} from '@tak-ps/vue-tabler';

export default {
    name: 'Download',
    components: {
        TablerIconButton,
        MustLogin,
        TablerDropdown,
        IconInfoCircle,
        IconDownload
    },
    props: ['job', 'auth'],
    data: function() {
        return {
            loginModal: false,
            perkModal: false,
            formats: [
                { fmt: 'geojson', name: 'GeoJSON+LD', url: 'https://stevage.github.io/ndgeojson/' },
                { fmt: 'shapefile', name: 'ShapeFile', url: 'https://en.wikipedia.org/wiki/Shapefile' },
                { fmt: 'csv', name: 'CSV', url: 'https://en.wikipedia.org/wiki/Comma-separated_values' }
            ]
        }
    },
    methods: {
        datapls: async function(jobid, fmt="geojson", validated=false) {
            if (!this.auth.username) return this.loginModal = true;

            if (fmt !== "geojson" && this.auth.level === 'basic') {
                return this.$emit('perk');
            } else if (fmt !== "geojson") {
                return await this.createExport(jobid, fmt);
            }

            if (!validated) {
                this.external(`${window.location.origin}/api/job/${jobid}/output/source.geojson.gz?token=${localStorage.token}`);
            } else {
                this.external(`${window.location.origin}/api/job/${jobid}/output/validated.geojson.gz?token=${localStorage.token}`);
            }
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        createExport: async function(jobid, fmt) {
            this.loading = true;
            const res = await window.std('/api/export', {
                method: 'POST',
                body: {
                    job_id: jobid,
                    format: fmt
                }
            });

            this.$router.push({ path: `/export/${res.id}` });
        }
    }
}
</script>
