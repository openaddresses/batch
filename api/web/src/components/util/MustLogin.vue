<template>
<TablerModal>
    <button type="button" class="btn-close" @click='close' aria-label="Close"></button>
    <div class="modal-status bg-yellow"></div>
    <div class="modal-body text-center py-4">
        <UserExclamationIcon size='60'/>
        <h3>Login Required</h3>

        <p class='my6'>
            Only logged in users can perform downloads. One of our largest costs is
            S3 egress, authenticated downloads allow us to prevent abuse and keep the project
            running and the data free!
        </p>
        <p class='my6'>
            Financial backers of the project can also export in CSV &amp; Shapefile, and sponsors
            recieve access to our validated data as well as direct AWS S3 access.
        </p>
    </div>
    <div class="modal-footer">
        <div @click='$emit("close")' class="cursor-pointer btn">Close</div>
        <div @click='$router.push("/login")' class="cursor-pointer btn btn-primary">Login</div>
    </div>
</TablerModal>
</template>

<script>
import {
    TablerModal 
} from '@tak-ps/vue-tabler';
import {
    UserExclamationIcon
} from 'vue-tabler-icons';

export default {
    name: 'MustLogin',
    components: {
        UserExclamationIcon,
        TablerModal
    }
}
</script>
