<template>
    <div class='col-12'>
        <TablerInput
            v-model='source'
            label='Source'
        >
            <TablerToggle
                v-if='showValidated'
                v-model='validated'
                label='Validated Data'
            />
        </TablerInput>

    </div>
</template>

<script>
import {
    TablerInput,
    TablerToggle
} from '@tak-ps/vue-tabler';

export default {
    name: 'QuerySource',
    components: {
        TablerInput,
        TablerToggle
    },
    props: {
        showValidated: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        return {
            validated: false,
            source: ''
        };
    },
    watch: {
        source: function() {
            this.$emit('source', this.source);
        },
        validated: function() {
            this.$emit('validated', this.validated);
        }
    }
}
</script>
