<template>
    <span>
        <IconBuildingCommunity
            v-if='layer === "buildings"'
            size='32'
            stroke='1'
        />
        <IconMapPin
            v-else-if='layer === "addresses"'
            size='32'
            stroke='1'
        />
        <IconShape
            v-else-if='layer === "parcels"'
            size='32'
            stroke='1'
        />
        <IconRoad
            v-else-if='layer === "centerlines"'
            size='32'
            stroke='1'
        />
    </span>
</template>

<script>
import {
    IconBuildingCommunity,
    IconMapPin,
    IconRoad,
    IconShape,
} from '@tabler/icons-vue';

export default {
    name: 'OAType',
    components: {
        IconBuildingCommunity,
        IconMapPin,
        IconRoad,
        IconShape,
    },
    props: {
        layer: {
            type: String
        }
    }
}
</script>
