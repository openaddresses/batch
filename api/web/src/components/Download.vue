<template>
    <span v-on:click.stop.prevent='datapls(job.job)' v-if='job.output.output' class='fr dropdown h24 cursor-pointer mx3 px12 round color-gray border border--gray-light border--gray-on-hover'>
        <DownloadIcon width="16" height="16"/>

        <div v-on:click.stop class='round dropdown-content cursor-default' style='width: 150px;'>
            <div class='col col--12'>

                <div class='flex-inline pb12'>
                    <button @click='mode = "base"' :class='{ "btn--stroke": mode !== "base" }' class='btn btn--s btn--pill btn--pill-hl round mx0'>Base</button>
                    <button @click='mode = "validated"' :class='{ "btn--stroke": mode !== "validated" }' class='btn btn--s btn--pill btn--pill-hr round mx0'>Validated</button>
                </div>

                <div v-if='mode === "base"' class='col col--12'>
                    <div class='col col--12'>
                        <span @click='datapls(job.job || job.id)' class='txt-underline-on-hover cursor-pointer'>
                            GeoJSON+LD
                        </span>
                        <InfoCircleIcon @click='external("https://stevage.github.io/ndgeojson/")' class='fr color-blue-on-hover cursor-pointer mt3' width="16" height="16"/>
                    </div>

                    <div class='col col--12'>
                        <span @click='datapls(job.job || job.id, "shapefile")' class='txt-underline-on-hover cursor-pointer'>
                            ShapeFile
                        </span>
                        <InfoCircleIcon @click='external("https://en.wikipedia.org/wiki/Shapefile")' class='fr color-blue-on-hover cursor-pointer mt3' width="16" height="16"/>
                    </div>

                    <div class='col col--12'>
                        <span @click='datapls(job.job || job.id, "csv")' class='txt-underline-on-hover cursor-pointer'>
                            CSV
                        </span>
                        <InfoCircleIcon @click='external("https://en.wikipedia.org/wiki/Comma-separated_values")' class='fr cursor-pointer color-blue-on-hover mt3' width="16" height="16"/>
                    </div>
                </div>
                <div v-else-if='!job.output.validated' class='col col--12'>
                    <div class='flex flex--center-main'>
                        <svg class='align-center icon color-gray' style='height: 40px; width: 40px;'><use href='#icon-alert'/></svg>
                    </div>
                    <div class='align-center'>No Validated Data</div>
                </div>
                <div v-else-if='auth.level !== "sponsor"' class='col col--12'>
                    <div class='flex flex--center-main'>
                        <svg class='align-center icon color-gray' style='height: 40px; width: 40px;'><use href='#icon-info'/></svg>
                    </div>
                    <div class='align-center'>Sponsor Benefit</div>
                </div>
                <div v-else class='col col--12'>
                    <div class='col col--12'>
                        <span @click='datapls(job.job || job.id, "geojson", true)' class='txt-underline-on-hover cursor-pointer'>
                            GeoJSON+LD
                        </span>
                        <InfoCircleIcon @click='external("https://stevage.github.io/ndgeojson/")' class='fr color-blue-on-hover cursor-pointer mt3' width="16" height="16"/>
                    </div>
                </div>
            </div>
        </div>
    </span>
</template>

<script>
import {
    InfoCircleIcon,
    DownloadIcon
} from 'vue-tabler-icons';

export default {
    name: 'Download',
    props: ['job', 'auth'],
    data: function() {
        return {
            mode: 'base'
        }
    },
    methods: {
        datapls: function(jobid, fmt="geojson", validated=false) {
            if (!this.auth.username) return this.$emit('login');

            if (fmt !== "geojson" && this.auth.level === 'basic') {
                return this.$emit('perk');
            } else if (fmt !== "geojson") {
                return this.createExport(jobid, fmt);
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
            try {
                this.loading = true;
                const res = await window.std('/api/export', {
                    method: 'POST',
                    body: {
                        job_id: jobid,
                        format: fmt
                    }
                });

                this.$router.push({ path: `/export/${res.id}` });
            } catch (err) {
                this.$emit('err', err);
            }
        }
    },
    components: {
        InfoCircleIcon,
        DownloadIcon
    }
}
</script>
