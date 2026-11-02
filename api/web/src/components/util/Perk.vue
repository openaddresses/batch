<template>
    <TablerModal>
        <button
            type='button'
            class='btn-close'
            aria-label='Close'
            @click='$emit("close")'
        />
        <div class='modal-status bg-blue' />
        <div class='modal-body text-center py-4'>
            <IconHeartHandshake size='60' />
            <h3>Donor Perk</h3>

            <p class='my6'>
                The OpenAddresses project relies on donations to keep the lights on.
            </p>
            <p class='my6'>
                Downloading as a Shapefile or CSV is a small perk we offer donors as a
                way to say thank-you.
            </p>
        </div>
        <div class='modal-footer'>
            <div
                class='cursor-pointer btn'
                @click='$emit("close")'
            >
                Close
            </div>
            <div
                class='cursor-pointer btn btn-primary'
                @click='donate'
            >
                Donate
            </div>
        </div>
    </TablerModal>
</template>

<script>
import {
    TablerModal
} from '@tak-ps/vue-tabler';
import {
    IconHeartHandshake
} from '@tabler/icons-vue';

export default {
    name: 'Perk',
    components: {
        IconHeartHandshake,
        TablerModal
    },
    emits: ['close'],
    methods: {
        donate: function() {
            this.$emit('close');
            this.$router.push({ path: '/profile' });
        }
    }
}
</script>
