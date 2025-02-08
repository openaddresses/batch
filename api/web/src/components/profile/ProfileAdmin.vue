<template>
    <div class='row row-cards'>
        <div class='col-12'>
            <AdminUser
                v-if='profile.access === "admin"'
                @err='$emit("err", $event)'
            />
        </div>
        <div class='col-12'>
            <AdminOverrides
                v-if='profile.access === "admin"'
                @err='$emit("err", $event)'
            />
        </div>
        <div class='col-12'>
            <AdminCollections
                v-if='profile.access === "admin"'
                @err='$emit("err", $event)'
            />
        </div>
    </div>
</template>

<script>
import AdminUser from './admin/AdminUser.vue'
import AdminCollections from './admin/AdminCollection.vue'
import AdminOverrides from './admin/AdminOverrides.vue'

export default {
    name: 'ProfileAdmin',
    components: {
        AdminUser,
        AdminCollections,
        AdminOverrides,
    },
    props: ['profile'],
    data: function() {
        return {
            hover: 'none'
        };
    }
}
</script>
