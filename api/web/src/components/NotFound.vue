<template>
    <div class='col col--12 py24'>
        <div class='align-center'>We couldn't find that page!</div>

        <div class='flex flex--center-main py24'>
            <button @click='$router.push("/data")' class='color-gray btn btn--stroke round'>Home</button>
        </div>
    </div>
</template>

<script>

export default {
    name: 'NotFound'
}
</script>
