<template>
    <div class='col col--12 grid pt24'>
        <AdminUser
            v-if='profile.access === "admin"'
            @err='$emit("err", $event)'
        />

        <AdminCollections
            v-if='profile.access === "admin"'
            @err='$emit("err", $event)'
        />
    </div>
</template>

<script>
import AdminUser from './AdminUser.vue'
import AdminCollections from './AdminCollection.vue'

export default {
    name: 'Profile',
    props: ['profile'],
    data: function() {
        return {
            hover: 'none'
        };
    },
    components: {
        AdminUser,
        AdminCollections,
    }
}
</script>
