<template>
    <div class='col col--12 flex flex--center-main my12'>
        <div>
            <template v-if='parseInt(total) <= parseInt(perpage)'>
                <button
                    class='btn btn--s round'
                    @click='page(0)'
                >
                    <svg
                        class='fl icon'
                        style='margin-top: 4px;'
                    ><use xlink:href='#icon-home' /></svg>
                    Home
                </button>
            </template>
            <template v-else>
                <button
                    class='btn btn--s btn--pill btn--pill-hl'
                    :class='{ "btn--stroke": current !== 0 }'
                    @click='page(0)'
                >
                    <svg
                        class='fl icon'
                        style='margin-top: 4px;'
                    ><use xlink:href='#icon-home' /></svg>
                    Home
                </button>

                <template v-if='end > 5 && current > 3'>
                    <span class=''> ... </span>
                </template>

                <template v-if='parseInt(total) / parseInt(perpage) > 2'>
                    <button
                        v-for='i in middle'
                        :key='i'
                        class='btn btn--s btn--pill btn--pill-hc'
                        :class='{ "btn--stroke": current !== i }'
                        @click='page(i)'
                        v-text='i + 1'
                    />
                </template>

                <template v-if='end > 5 && current < end - spread'>
                    <span class=''> ... </span>
                </template>
                <button
                    class='btn btn--s btn--pill btn--pill-hr'
                    :class='{ "btn--stroke": current !== end - 1 }'
                    @click='page(end - 1)'
                    v-text='end'
                />
            </template>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Pager',
    props: [ 'total', 'perpage' ],
    data: function() {
        return this.create();
    },
    watch: {
        total: function() {
            const set = this.create();

            this.spread = set.spread;
            this.middle = set.middle;
            this.current = set.current;
            this.end = set.end;
        },
        perpage: function() {
            const set = this.create();

            this.spread = set.spread;
            this.middle = set.middle;
            this.current = set.current;
            this.end = set.end;
        },
        current: function() {
            if (this.end < 5) return; // All buttons are shown already

            let start;
            if (this.current <= 3) {
                start = 0;
            } else if (this.current >= this.end - 4) {
                start = this.end - this.spread - 2;
            } else {
                start = this.current - 3;
            }

            this.middle = this.middle.map((ele, i) => {
                return start + i + 1;
            });
        }
    },
    methods: {
        create: function() {
            const end = Math.ceil(parseInt(this.total) / parseInt(this.perpage));
            let spread; //Number of pages in between home button and last page
            if (end <= 2) {
                spread = 0;
            } else if (end >= 7) {
                spread = 5;
            } else {
                spread = end - 2;
            }

            // Array containing middle page number
            let middleAr = new Array(spread).fill(1, 0, spread).map((ele, i) => {
                return 1 + i;
            });

            return {
                spread: spread,
                middle: middleAr,
                current: 0,
                end: end
            };
        },
        page: function(page) {
            this.current = page;
            this.$emit('page', page);
        }
    }
}
</script>
