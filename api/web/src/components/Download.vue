<template>
    <span v-on:click.stop.prevent='datapls(job.job)' v-if='job.output.output' class='fr dropdown h24 cursor-pointer mx3 px12 round color-gray border border--gray-light border--gray-on-hover'>
        <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-download" /></svg>

        <div class='round dropdown-content'>
            <div v-on:click.stop.prevent='datapls(job.job || job.id)' class='round bg-gray-faint-on-hover'>GeoJSON</div>
            <div v-on:click.stop.prevent='datapls(job.job || job.id, "shapefile")' class='round bg-gray-faint-on-hover'>ShapeFile</div>
            <div v-on:click.stop.prevent='datapls(job.job || job.id, "csv")' class='round bg-gray-faint-on-hover'>CSV</div>
        </div>
    </span>
</template>

<script>

export default {
    name: 'Download',
    props: ['job', 'auth'],
    methods: {
        datapls: function(jobid, fmt) {
            if (!this.auth.username) return this.$emit('login');

            if (fmt && this.auth.level === 'basic') {
                return this.$emit('perk');
            } else if (fmt) {
                return this.createExport(jobid, fmt);
            }

            this.external(`${window.location.origin}/api/job/${jobid}/output/source.geojson.gz`);
        },
        external: function(url) {
            window.open(url, "_blank");
        },
        createExport: function(jobid, fmt) {
            this.loading = true;
            fetch(window.location.origin + `/api/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    job_id: jobid,
                    format: fmt
                })
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to create export');
                }

                return res.json();
            }).then((res) => {
                console.error(res)
                this.$router.push({ path: `/export/${res.id}` });
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    }
}
</script>
