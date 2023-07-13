<template>
<span v-tooltip='status' class="status-indicator status-indicator-animated" :class='{
    "status-yellow": status === "Pending",
    "status-yellow": status === "Running",
    "status-orange": status === "Warning",
    "status-green": status === "Success",
    "status-red": status === "Fail",
    "status-dark": tatus === "Unknown",
}'>
    <span class="status-indicator-circle"></span>
    <span class="status-indicator-circle"></span>
    <span class="status-indicator-circle"></span>
</span>
</template>

<script>
export default {
    name: 'Status',
    props: {
        status: {
            type: String,
            required: true
        }
    }
}
</script>
