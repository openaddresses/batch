<template>
<span>
    <BuildingCommunityIcon v-if='layer === "buildings"'/>
    <MapPinIcon v-else-if='layer === "addresses"'/>
    <ShapeIcon v-else-if='layer === "parcels"'/>
</span>
</template>

<script>
import {
    BuildingCommunityIcon,
    MapPinIcon,
    ShapeIcon,
} from 'vue-tabler-icons';

export default {
    name: 'OAType',
    props: {
        layer: {
            type: String
        }
    },
    components: {
        BuildingCommunityIcon,
        MapPinIcon,
        ShapeIcon,
    }
}
</script>
