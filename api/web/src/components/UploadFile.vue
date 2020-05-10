<template>
    <div class='col col--12 py12 px12 border border--gray-light round'>
        <div id='dragndrop' class='col col--12'>

            <div class='col col--12' :class='{ "none": progress !== 0 }'>
                <div class='pb6'>Select a file to upload</div>
                <form>
                    <input type='file' id='file' name='file' accept='*' @change='upload' />
                </form>
            </div>

            <div v-if='progress && progress < 100' class='col col--12'>
                <div class='col col--12'>
                    <span class='txt-truncate inline' v-text='name'/>
                </div>

                <div class='col col--12 border border--gray-light round h12 my12'>
                    <div :style='{ "width": progress + "%" }' class='h-full bg-gray-light'></div>
                </div>
            </div>
            <div v-else-if='progress === 100'>
                <div class='col col--12'>
                    <span class='txt-truncate inline' v-text='name'/>
                </div>
                <div class='col col--12 pre'>
                    UPLOAD FILE
                </div>
                <div class='col col--12 clearfix pt12'>
                    <button class='btn round btn--stroke fr btn--gray'>
                        <svg class='fl icon' style='margin-top: 6px;'><use href='#icon-refresh'/></svg>Upload
                    </button>
                </div>
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
            name: '',
            progress: 0
        }
    },
    methods: {
        upload: function(event) {
            const file = event.target.files[0];
            this.name = file.name;

            const xhr = new XMLHttpRequest()
            const formData = new FormData()

            xhr.open('POST', new URL(`${window.location.origin}/api/upload`), true)
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
            xhr.upload.addEventListener('progress', (e) => {
                this.progress = (e.loaded * 100.0 / e.total) || 100
            });

            xhr.addEventListener('readystatechange', () => {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    this.progress = 100;
                } else if (xhr.readyState == 4 && xhr.status != 200) {
                    this.$emit('erro', 'Failed to upload file');
                }
            });

            formData.append('file', file)
            xhr.send(formData)
        }
    }
}

</script>
