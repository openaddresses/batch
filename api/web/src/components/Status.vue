<template>
    <div>
        <template v-if='status === "Pending"'>
            <svg v-tooltip='"Pending"' class='fl icon ml12 color-yellow opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
        </template>
        <template v-if='status === "Running"'>
            <svg v-tooltip='"Running"' class='fl icon ml12 color-yellow opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
        </template>
        <template v-else-if='status === "Warn"'>
            <svg v-tooltip='"Warning"' class='fl icon ml12 color-orange opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
        </template>
        <template v-else-if='status === "Success"'>
            <svg v-tooltip='"Successful"' class='fl icon ml12 color-green opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
        </template>
        <template v-else-if='status === "Fail"'>
            <svg v-tooltip='"Failed"' class='fl icon ml12 color-red opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Status',
    props: [ 'status' ]
}
</script>
