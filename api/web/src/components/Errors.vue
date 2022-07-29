<template>
    <div class='col col--12 grid pt12'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>Source Errors:</h2>

                <button @click='refresh' class='btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                </button>

                <button @click='showFilter = !showFilter' class='mr12 btn round btn--stroke fr color-gray'>
                    <svg class='icon'><use xlink:href='#icon-search'/></svg>
                </button>

                <template v-if='showFilter'>
                    <div class='col col--12 grid border border--gray px6 py6 round mb12 relative'>
                        <div class='absolute triangle--u triangle color-gray' style='top: -12px; right: 75px;'></div>

                        <div class='col col--6 px6'>
                            <QuerySource @source='filter.source = $event'/>
                        </div>
                        <div class='col col--3 px6'>
                            <QueryLayer @layer='filter.layer = $event' />
                        </div>
                        <div class='col col--3 px6'>
                            <QueryStatus @status='filter.status = $event'/>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <template v-if='loading'>
            <div class='flex flex--center-main w-full py24'>
                <div class='loading'></div>
            </div>
        </template>
        <template v-else-if='!problems.length'>
            <div class='flex flex--center-main w-full'>
                <div class='py24'>
                    <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                </div>
            </div>
            <div class='w-full align-center txt-bold'>No Errors Found</div>
            <div @click='external("https://github.com/openaddresses/openaddresses/blob/master/CONTRIBUTING.md")' class='align-center w-full py6 txt-underline-on-hover cursor-pointer'>Missing a source? Add it!</div>
        </template>
        <template v-else>
            <div @click='$router.push({ path: `/job/${error.job}` })' :key='error.job' v-for='(error, i) in problems' class='col col--12 grid'>
                <div class='col col--12 grid py12 cursor-pointer bg-darken10-on-hover round'>
                    <div class='col col--1'>
                        <Status :status='error.status'/>
                    </div>
                    <div class='col col--1'>
                        Job <span v-text='error.job'/>
                    </div>
                    <div class='col col--6'>
                        <span v-text='`${error.source_name} - ${error.layer} - ${error.name}`'/>
                    </div>
                    <div class='col col--4'>
                        <ErrorsModerate
                            :error='error'
                            @moderated="problems.splice(i, 1)"
                        />
                    </div>

                    <div class='col col--12 py3'>
                        <div :key='message' v-for='message in error.messages' class='align-center w-full' v-text='message'></div>
                    </div>
                </div>
            </div>

        </template>
    </div>
</template>

<script>
import Status from './Status.vue';
import QueryStatus from './query/Status.vue';
import QuerySource from './query/Source.vue';
import QueryLayer from './query/Layer.vue';
import ErrorsModerate from './ErrorsModerate.vue';

export default {
    name: 'Errors',
    props: [ ],
    data: function() {
        return {
            loading: true,
            showFilter: false,
            filter: {
                source: '',
                layer: 'all',
                status: 'All'
            },
            problems: []
        };
    },
    mounted: function() {
        this.refresh();
    },
    components: {
        Status,
        QueryStatus,
        QuerySource,
        QueryLayer,
        ErrorsModerate
    },
    watch: {
        problems: function() {
            this.$emit('errors', this.problems.length);
        },
        'filter.source': function() {
            this.refresh();
        },
        'filter.layer': function() {
            this.refresh();
        },
        'filter.status': function() {
            this.refresh();
        }
    },
    methods: {
        refresh: function() {
            this.getProblems();
        },
        getProblems: async function() {
            try {
                this.loading = true;
                const url = new URL('/api/job/error', window.location.origin);
                if (this.filter.source !== '') url.searchParams.set('source', this.filter.source);
                if (this.filter.layer !== 'all') url.searchParams.set('layer', this.filter.layer);
                if (this.filter.status !== 'All') url.searchParams.set('status', this.filter.status);

                this.problems = await window.std(url);
                this.loading = false;
            } catch(err) {
                this.$emit('err', err);
            }
        },
        external: function(url) {
            window.open(url, "_blank");
        }
    }
}
</script>
