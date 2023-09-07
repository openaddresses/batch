<template>
    <div class='z2 fixed top right bottom left scroll-auto bg-darken50'>
        <div class='flex flex--center-main pt36'>
            <div class='bg-white round relative w600'>
                <button @click='$emit("perk", false)' class='absolute top right px12 py12'>
                    <svg class='icon link color-darken50'><use xlink:href='#icon-close'></use></svg>
                </button>

                <div class='flex flex--center-main'>
                    <div class='pt12'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                    </div>
                </div>

                <div class='txt-l mb12 align-center'>Donor Perk</div>
                <div class='txt-m align-center'>
                    <p>The OpenAddresses project relies on donations to keeps the lights on</p>
                </div>
                <div class='txt-m align-center'>
                    Downloading as a Shapefile or CSV is a small perk we offer donors as a
                    way to say thank-you
                </div>

                <button @click='donate' class='fr mb12 mr12 btn round btn--gray btn--stroke'>Donate</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Err',
    props: ['perk'],
    methods: {
        donate: function() {
            this.$emit('perk', false);
            this.$router.push({ path: "/profile" })
        }
    }
}
</script>
