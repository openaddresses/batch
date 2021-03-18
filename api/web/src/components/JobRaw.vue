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

                <span v-if='job.source' class='fr h24 cursor-pointer mx3 px12 round color-gray border border--white border--gray-on-hover'>
                    <svg width="16" height="16"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-brand-github" /></svg>
                </span>

            </div>
        </div>

    </div>
</template>

<script>

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
        getJob: function() {
            this.loading.job = true;
            fetch(window.location.origin + `/api/job/${this.jobid}`, {
                method: 'GET'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get job');
                }

                return res.json();
            }).then((res) => {
                this.job = res;

                this.name = this.job.source
                    .replace(/.*sources\//, '')
                    .replace(/\.json/, '');

                this.loading.job = false;
                this.getRaw();
            }).catch((err) => {
                this.$emit('err', err);
            });
        },
        getRaw: function() {
            this.loading.raw = true;
            fetch(window.location.origin + `/api/job/${this.jobid}/raw`, {
                method: 'GET'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to get job');
                }

                return res.json();
            }).then((res) => {
                this.raw = res;
                this.loading.raw = false;
            }).catch((err) => {
                this.$emit('err', err);
            });
        },

    }
}
</script>
