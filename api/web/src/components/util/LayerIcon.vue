<template>
<span>
    <IconBuildingCommunity v-if='layer === "buildings"' size='32'/>
    <IconMapPin v-else-if='layer === "addresses"' size='32'/>
    <IconShape v-else-if='layer === "parcels"' size='32'/>
</span>
</template>

<script>
import {
    IconBuildingCommunity,
    IconMapPin,
    IconShape,
} from '@tabler/icons-vue';

export default {
    name: 'OAType',
    props: {
        layer: {
            type: String
        }
    },
    components: {
        IconBuildingCommunity,
        IconMapPin,
        IconShape,
    }
}
</script>
