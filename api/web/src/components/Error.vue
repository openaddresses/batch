<template>
    <div class='z2 fixed top right bottom left scroll-auto bg-darken50'>
        <div class='flex-parent flex-parent--center-main pt36'>
            <div class='flex-child bg-white round relative w600'>
                <button @click='$emit("err", false)' class='absolute top right px12 py12'>
                    <svg class='icon link color-darken50'><use xlink:href='#icon-close'></use></svg>
                </button>
                <div class='px24 py24'>
                    <div class='txt-l mb12'>Uh Oh!</div>
                    <div class='txt-m' v-text='err.message'></div>
                    <button @click='$emit("err", false)' class='fr mb24 btn round btn--stroke'>Ok</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Error',
    props: ['err']
}
</script>
