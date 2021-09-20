<template>
    <div class='col col--12 grid pt24'>
        <AdminUser
            v-if='profile.access === "admin"'
            @err='$emit("err", $event)'
        />

        <AdminOverrides
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
import AdminUser from './admin/AdminUser.vue'
import AdminCollections from './admin/AdminCollection.vue'
import AdminOverrides from './admin/AdminOverrides.vue'

export default {
    name: 'ProfileAdmin',
    props: ['profile'],
    data: function() {
        return {
            hover: 'none'
        };
    },
    components: {
        AdminUser,
        AdminCollections,
        AdminOverrides
    }
}
</script>
