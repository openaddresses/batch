<template>
    <div class='z2 fixed top right bottom left scroll-auto bg-darken50'>
        <div class='flex flex--center-main pt36'>
            <div class='bg-white round relative w600'>
                <button @click='$emit("login")' class='absolute top right px12 py12'>
                    <svg class='icon link color-darken50'><use xlink:href='#icon-close'></use></svg>
                </button>

                <div class='flex flex--center-main'>
                    <div class='pt12'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                    </div>
                </div>

                <div class='txt-l mb12 align-center'>Login Required</div>
                <div class='txt-m align-center px12'>
                    <p class='my6'>
                        Only logged in users can perform downloads. One of our largest costs is
                        S3 egress, authenticated downloads allow us to prevent abuse and keep the project
                        running and the data free!
                    </p>
                    <p class='my6'>
                        Financial backers of the project can also export in CSV &amp; Shapefile, and sponsors
                        recieve access to our validated data as well as direct AWS S3 access.
                    </p>
               </div>

                <button @click='$emit("login")' class='fr mb12 mr12 btn round btn--gray btn--stroke'>Ok</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Err'
}
</script>
