<template>
    <ApiReference :configuration='configuration' />
</template>

<script setup>
import { ApiReference } from '@scalar/api-reference';
import '@scalar/api-reference/style.css';

const configuration = {
    url: String(window.stdurl('/api/openapi')),
    hideDarkModeToggle: false,
    showSidebar: true,
    hideClientButton: true,
    metaData: {
        title: 'OpenAddresses Batch',
    },
};
</script>
