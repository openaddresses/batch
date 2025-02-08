<template>
    <TablerDropdown
        v-if='job.output.output'
        @click.stop.prevent=''
    >
        <slot>
            <IconDownload
                size='32'
                class='cursor-pointer'
                stroke='1'
            />
        </slot>

        <template #dropdown>
            <div class='row'>
                <div class='flex-inline pb12'>
                    <button
                        :class='{ "btn--stroke": mode !== "base" }'
                        class='btn btn--s btn--pill btn--pill-hl round mx0'
                        @click='mode = "base"'
                    >
                        Base
                    </button>
                    <button
                        :class='{ "btn--stroke": mode !== "validated" }'
                        class='btn btn--s btn--pill btn--pill-hr round mx0'
                        @click='mode = "validated"'
                    >
                        Validated
                    </button>
                </div>

                <div
                    v-if='mode === "base"'
                    class='col-12'
                >
                    <div class='col-12 d-flex px-2'>
                        <span
                            class='cursor-pointer'
                            @click='datapls(job.job || job.id)'
                        >
                            GeoJSON+LD
                        </span>
                        <div class='ms-auto'>
                            <IconInfoCircle
                                class='fr color-blue-on-hover cursor-pointer mt3'
                                size='16'
                                stroke='1'
                                @click='external("https://stevage.github.io/ndgeojson/")'
                            />
                        </div>
                    </div>

                    <div class='col-12 d-flex px-2'>
                        <span
                            class='cursor-pointer'
                            @click='datapls(job.job || job.id, "shapefile")'
                        >
                            ShapeFile
                        </span>
                        <div class='ms-auto'>
                            <IconInfoCircle
                                class='fr color-blue-on-hover cursor-pointer mt3'
                                size='16'
                                stroke='1'
                                @click='external("https://en.wikipedia.org/wiki/Shapefile")'
                            />
                        </div>
                    </div>

                    <div class='col-12 d-flex px-2'>
                        <span
                            class='cursor-pointer'
                            @click='datapls(job.job || job.id, "csv")'
                        >
                            CSV
                        </span>
                        <div class='ms-auto'>
                            <IconInfoCircle
                                class='fr cursor-pointer color-blue-on-hover mt3'
                                size='16'
                                stroke='1'
                                @click='external("https://en.wikipedia.org/wiki/Comma-separated_values")'
                            />
                        </div>
                    </div>
                </div>
                <div
                    v-else-if='!job.output.validated'
                    class='col col--12'
                >
                    <div class='flex flex--center-main'>
                        <svg
                            class='align-center icon color-gray'
                            style='height: 40px; width: 40px;'
                        ><use href='#icon-alert' /></svg>
                    </div>
                    <div class='align-center'>
                        No Validated Data
                    </div>
                </div>
                <div
                    v-else-if='auth.level !== "sponsor"'
                    class='col col--12'
                >
                    <div class='flex flex--center-main'>
                        <svg
                            class='align-center icon color-gray'
                            style='height: 40px; width: 40px;'
                        ><use href='#icon-info' /></svg>
                    </div>
                    <div class='align-center'>
                        Sponsor Benefit
                    </div>
                </div>
                <div
                    v-else
                    class='col col--12'
                >
                    <div class='col col--12'>
                        <span
                            class='cursor-pointer'
                            @click='datapls(job.job || job.id, "geojson", true)'
                        >
                            GeoJSON+LD
                        </span>
                        <IconInfoCircle
                            class='fr color-blue-on-hover cursor-pointer mt3'
                            size='16'
                            stroke='1'
                            @click='external("https://stevage.github.io/ndgeojson/")'
                        />
                    </div>
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
    TablerDropdown
} from '@tak-ps/vue-tabler';

export default {
    name: 'Download',
    components: {
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
            mode: 'base'
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
