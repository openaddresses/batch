<template>
    <div class='col col--12 py12 my12 px12 border border--gray-light round'>
        <div id='dragndrop' class='col col--12'>
            <form class='my-form'>
                <input type="file" id="fileElem" multiple accept="image/*" @change="handleFiles(this.files)">
                <label class="button" for="fileElem">Select a file</label>
            </form>

            <div class='col col--12 border border--gray-light round h12 my12'>
                <div :style='{ "width": progress + "%" }' class='h-full bg-gray-light'></div>
            </div>
        </div>
    </div>
</template>

<script>

export default {
    name: 'UploadFile',
    props: [],
    data: function() {
        return {
            progress: 50
        }
    },
    methods: {
        handleFiles: function() {

        }
    }
}

</script>
