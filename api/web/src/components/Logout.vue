<template>
<div class="page page-center">
    <div class="container container-normal py-4">
        <div class="row align-items-center g-4">
            <div class="col-lg">
                <div class="container-tight">
                    <div class="card card-md">
                        <div class="card-body">
                            <div class='text-center' style='margin-bottom: 24px;'>
                                <img src='/logo.jpg' class='rounded' height='150'/>
                            </div>
                            <TablerLoading desc='Logging Out...'/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import {
    TablerLoading
} from '@tak-ps/vue-tabler';

export default {
    name: 'Logout',
    components: {
        TablerLoading
    },
    mounted: function() {
        delete localStorage.token;
        this.$emit('auth');
        this.$router.push("/data");
    }
}
</script>
