<template>
    <TablerModal>
        <button
            type='button'
            class='btn-close'
            aria-label='Close'
            @click='close'
        />
        <div class='modal-status bg-yellow' />
        <div class='modal-body text-center py-4'>
            <IconUserExclamation size='60' />
            <h3>Login Required</h3>

            <p class='my6'>
                Only logged in users can perform downloads. One of our largest costs is
                S3 egress, authenticated downloads allow us to prevent abuse and keep the project
                running and the data free!
            </p>
            <p class='my6'>
                Financial backers of the project can also export in CSV &amp; Shapefile, and sponsors
                receive access to our validated data as well as direct AWS S3 access.
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
                @click='$router.push("/login")'
            >
                Login
            </div>
        </div>
    </TablerModal>
</template>

<script>
import {
    TablerModal
} from '@tak-ps/vue-tabler';
import {
    IconUserExclamation
} from '@tabler/icons-vue';

export default {
    name: 'MustLogin',
    components: {
        IconUserExclamation,
        TablerModal
    }
}
</script>
