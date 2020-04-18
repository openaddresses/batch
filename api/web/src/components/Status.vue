<template>
    <div>
        <template v-if='status === "Pending"'>
            <svg class='fl icon ml12 color-yellow opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
        </template>
        <template v-else-if='status === "Success"'>
            <svg class='fl icon ml12 color-green opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
        </template>
        <template v-else-if='status === "Fail"'>
            <svg class='fl icon ml12 color-red opacity50' style='height: 16px; margin-top: 4px;'><use xlink:href='#icon-circle'/></svg>
        </template>
    </div>
</template>

<script>
export default {
    name: 'Status',
    props: [ 'status' ]
}
</script>
