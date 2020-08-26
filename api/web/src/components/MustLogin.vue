<template>
    <div class='z2 fixed top right bottom left scroll-auto bg-darken50'>
        <div class='flex-parent flex-parent--center-main pt36'>
            <div class='flex-child bg-white round relative w600'>
                <button @click='$emit("login")' class='absolute top right px12 py12'>
                    <svg class='icon link color-darken50'><use xlink:href='#icon-close'></use></svg>
                </button>

                <div class='flex-parent flex-parent--center-main'>
                    <div class='flex-child pt12'>
                        <svg class='icon h60 w60 color-gray'><use href='#icon-info'/></svg>
                    </div>
                </div>

                <div class='txt-l mb12 align-center'>Login Required</div>
                <div class='txt-m align-center px12'>
                    <p class='my6'>
                        The user must be authenticated to perform a download. One of our largest costs is
                        S3 egress, authenticatd downloads allow us to prevent abuse and keep the project running and the data free!
                    </p>
                    <p class='my6'>
                        Want faster downloads? Have AWS? The Jobs, Data, &amp; Collections API all return an `s3` property which links
                        to a requester pays object on S3. For those that are able, this is the best way to download data.
                    </p>
                    <p class='my6'>
                        OpenAddresses is entirely funded by volunteers (many of then the developers themselves!)
                        Please consider <a class='color-blue txt-underline' href='https://opencollective.com/openaddresses'>donating</a> if you are able.
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
