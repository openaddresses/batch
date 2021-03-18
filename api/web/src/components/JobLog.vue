<template>
    <div class='col col--12'>
        <div class='col col--12 grid border-b border--gray-light bg-white pt12'>
            <div class='col col--12'>
                <button @click='$router.go(-1)' class='btn round btn--stroke fl color-gray'>
                    <svg class='icon'><use xlink:href='#icon-arrow-left'/></svg>
                </button>
                <h2 class='txt-h4 ml12 pb12 fl'>Job #<span v-text='jobid'/></h2>
            </div>
        </div>

        <Log @err='$emit("err", $event)' logtype='job' :id='jobid'/>
    </div>
</template>

<script>
import Log from './Log.vue'

export default {
    name: 'JobLog',
    props: ['jobid'],
    components: {
        Log
    }
}
</script>
