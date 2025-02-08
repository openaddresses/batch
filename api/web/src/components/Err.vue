<template>
    <div class='z2 fixed top right bottom left scroll-auto bg-darken50'>
        <div class='flex flex--center-main pt36'>
            <div class='bg-white round relative w600'>
                <button
                    class='absolute top right px12 py12'
                    @click='$emit("err", false)'
                >
                    <svg class='icon link color-darken50'><use xlink:href='#icon-close' /></svg>
                </button>

                <div class='flex flex--center-main'>
                    <div class='pt12'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-alert' /></svg>
                    </div>
                </div>

                <div class='txt-l mb12 align-center'>
                    Uh Oh!
                </div>
                <div
                    class='txt-m align-center'
                    v-text='err.message'
                />

                <a
                    href='mailto:hello@openaddresses.io'
                    class='fl btn btn--stroke btn--gray round ml12'
                >Contact Us</a>
                <button
                    class='fr mb12 mr12 btn round btn--gray btn--stroke'
                    @click='$emit("err", false)'
                >
                    Ok
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Err',
    props: ['err']
}
</script>
