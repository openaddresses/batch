<template>
<div class='row row-deck row-cards'>
    <div class='col-12'>
        <div class='card'>
            <div class='card-header'>
                <h3 class='card-title'>Profile Settings</h3>
            </div>
            <div class='card-body row'>
                <div class='col-md-6'>
                    <TablerInput label='Username' v-model='p.username'/>
                </div>
                <div class='col-md-6'>
                    <TablerInput label='Email' v-model='p.email'/>
                </div>
                <div class='col-md-12 d-flex'>
                    <div class='ms-auto my-2'>
                        <button disabled class='btn btn-primary'>Update</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class='col-12'>
        <div class='card'>
            <div class='card-header'>
                <h3 class='card-title'>Contribution</h3>

                <div class='d-flex ms-auto'>
                    <RefreshIcon @click='$emit("refresh")' class='cursor-pointer'/>'
                </div>
            </div>
            <div class='card-body row'>
                <div v-if='!showDowngrade'>
                    <div class='col-12 text-center pb-2'>
                        OpenAddresses operates on a very small budget
                    </div>
                    <div class='col-12 text-center py-2'>
                        Please consider contributing to support to keep the lights on as well as support future development of the project.
                    </div>
                </div>
                <div v-else class='col-12 border rounde my-2 px-2 py-2'>
                    <p class='text-center'>We're sorry to see you go!</p>
                    <p class='text-center'>Your monthly contribution is managed via OpenCollective and downgrading must be done through them</p>

                    <div class='d-flex justify-content-center btn-list'>
                        <button @click='down' class='btn'>Downgrade</button>
                        <a href='mailto:hello@openaddresses.io' class='btn btn-primary'>Contact Us</a>
                    </div>
                </div>

                <div class='col-12 row'>
                    <div @click='oc("basic")' class='col-4 rounded py-2 my-2' @mouseover="hover = 'basic'" @mouseleave="hover = false" :class='{
                        "cursor-pointer": profile.level !== "basic",
                        "border border--gray-light": profile.level === "basic",
                    }'>
                        <UserIcon class='w-100 align-center' width='36' height='36'/>

                        <div class='text-center'>Basic</div>
                        <div class='text-center txt-s'>No Cost</div>

                        <div class='col-12 pt-2'>
                            <CircleCheckIcon v-if='profile.level === "basic"' class='w-100 text-center'/>
                            <CircleIcon v-else-if='hover === "basic"' class='w-100 text-center'/>
                            <CircleDottedIcon v-else class='w-full align-center'/>
                        </div>
                    </div>
                    <div @click='oc("backer")' class='col-4 rounded py-2 my-2' @mouseover="hover = 'backer'" @mouseleave="hover = false" :class='{
                        "cursor-pointer": profile.level !== "backer",
                        "border border--gray-light": profile.level === "backer",
                    }'>
                        <CoinIcon class='w-full align-center' width="36" height="36"/>
                        <div class='text-center'>Backer</div>
                        <div class='text-center txt-s'>&gt;= $5</div>

                        <div class='col col--12 pt12'>
                            <CircleCheckIcon v-if='profile.level === "backer"' class='w-full align-center' width="18" height="18"/>
                            <CircleIcon v-else-if='hover === "backer"' class='w-full align-center' width="18" height="18"/>
                            <CircleDottedIcon v-else class='w-full align-center' width="18" height="18"/>
                        </div>
                    </div>
                    <div @click='oc("sponsor")' class='col-4 rounded py-2 my-2' @mouseover="hover = 'sponsor'" @mouseleave="hover = false" :class='{
                        "cursor-pointer": profile.level !== "sponsor",
                        "border border--gray-light": profile.level === "sponsor",
                    }'>
                        <TrophyIcon class='w-100 text-center' width="36" height="36"/>
                        <div class='text-center'>Sponsor</div>
                        <div class='text-center txt-s'>&gt;= $100</div>

                        <div class='col col--12 pt12'>
                            <CircleCheckIcon v-if='profile.level === "sponsor"' class='w-full align-center' width="18" height="18"/>
                            <CircleIcon v-else-if='hover === "sponsor"' class='w-full align-center' width="18" height="18"/>
                            <CircleDottedIcon v-else class='w-full align-center' width="18" height="18"/>
                        </div>
                    </div>

                    <div class='col col-4'>
                        <div class='txt-s text-center'>GeoJSON Format</div>
                        <div class='txt-s text-center'>CDN Data Access</div>
                    </div>

                    <div class='col col--4'>
                        <div class='txt-s text-center'>All Basic Features</div>
                        <div class='txt-s text-center'>300 Custom Format Exports per Month</div>
                    </div>

                    <div class='col col--4'>
                        <div class='txt-s text-center'>All Backer Features</div>
                        <div class='txt-s text-center'>Direct AWS S3 Access</div>
                        <div class='txt-s text-center'>Validated Data</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class='col-12'>
        <Tokens @err='$emit("err", $event)'/>
    </div>

    <template v-if='profile.level !== "basic"'>
        <div class='col-12'>
            <Exports :profile='profile' @err='$emit("err", $event)'/>
        </div>
    </template>
    <template v-else>
        <div class='col col--12 grid border-b border--gray-light pt24'>
            <div class='col col--12'>
                <h2 class='txt-h4 ml12 pb12 fl'>Exports:</h2>
            </div>
        </div>

        <div class='col col--12 align-center py12'>
            Become a Backer of the project to export sources in custom formats
        </div>
    </template>
</div>
</template>

<script>
import {
    TablerInput
} from '@tak-ps/vue-tabler';

import {
    CoinIcon,
    RefreshIcon,
    CircleCheckIcon,
    CircleDottedIcon,
    CircleIcon
} from 'vue-tabler-icons';
import Tokens from './Tokens.vue'
import Exports from '../cards/Exports.vue'

export default {
    name: 'ProfileDefault',
    props: [ 'profile' ],
    data: function() {
        return {
            hover: 'none',
            showDowngrade: false,
            p: {
                username: this.profile.username,
                email: this.profile.email
            }
        };
    },
    methods: {
        down: function() {
            window.open('https://docs.opencollective.com/help/financial-contributors/payments#cancel-a-recurring-contribution', "_blank");
        },
        oc: function(level) {
            if (this.profile.level === level) return;

            if (level === 'basic' && this.profile.level !== 'basic') {
                this.showDowngrade = true;
                return;
            } else {
                this.showDowngrade = false;
            }

            if (level === 'sponsor') {
                window.open('https://opencollective.com/openaddresses/contribute/sponsor-13360/checkout', "_blank");
            } else if (level === 'backer') {
                window.open('https://opencollective.com/openaddresses/contribute/backer-13359/checkout', "_blank");
            } else {
                window.open('https://opencollective.com/openaddresses/contribute', "_blank");
            }
        },
    },
    components: {
        Tokens,
        Exports,
        CoinIcon,
        RefreshIcon,
        CircleCheckIcon,
        CircleDottedIcon,
        CircleIcon,
        TablerInput
    }
}
</script>
