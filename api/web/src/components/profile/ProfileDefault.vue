<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid grid--gut12'>
            <div class='col col--6 pt12'>
                <label>Username:</label>
                <input v-model='p.username' class='input' placeholder='Username'/>
            </div>
            <div class='col col--6 pt12'>
                <label>Email:</label>
                <input v-model='p.email' class='input' placeholder='Username'/>
            </div>
            <div class='col col--12 clearfix pt12'>
                <button disabled class='btn btn--stroke btn--gray btn--s round fr'>Update</button>
            </div>
        </div>

        <div class='col col--12 grid border-b border--gray-light pb12 pt24'>
            <div class='col col--12 clearfix'>
                <h2 class='fl txt-h4 ml12'>Contribution:</h2>

                <div class='fr'>
                    <button @click='$emit("refresh")' class='btn round btn--stroke color-gray mx3'>
                        <svg class='icon'><use xlink:href='#icon-refresh'/></svg>
                    </button>
                </div>
            </div>
        </div>
            <div class='col col--12 align-center'>
                OpenAddresses operates on a very small budget
            </div>
            <div class='col col--12 align-center'>
                Please consider contributing to support to keep the lights on as well as support future development of the project.
            </div>

        <div class='col col--12 grid'>
            <div @click='oc("basic")' class='col col--4 round py12 my12' @mouseover="hover = 'basic'" @mouseleave="hover = false" :class='{
                "cursor-pointer": profile.level !== "basic",
                "border border--gray-light": profile.level === "basic",
            }'>
                <svg class='w-full align-center' width="36" height="36"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-user" /></svg>

                <div class='align-center'>Basic</div>
                <div class='align-center txt-s'>free</div>

                <div class='col col--12 pt12'>
                    <svg v-if='profile.level === "basic"' class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle-check" /></svg>
                    <svg v-else-if='hover === "basic"' class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle" /></svg>
                    <svg v-else class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle-dotted" /></svg>
                </div>
            </div>
            <div @click='oc("backer")' class='col col--4 round py12 my12' @mouseover="hover = 'backer'" @mouseleave="hover = false" :class='{
                "cursor-pointer": profile.level !== "backer",
                "border border--gray-light": profile.level === "backer",
            }'>
                <svg class='w-full align-center' width="36" height="36"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-coin" /></svg>
                <div class='align-center'>Backer</div>
                <div class='align-center txt-s'>&gt; $5</div>

                <div class='col col--12 pt12'>
                    <svg v-if='profile.level === "backer"' class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle-check" /></svg>
                    <svg v-else-if='hover === "backer"' class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle" /></svg>
                    <svg v-else class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle-dotted" /></svg>
                </div>
            </div>
            <div @click='oc("sponsor")' class='col col--4 round py12 my12' @mouseover="hover = 'sponsor'" @mouseleave="hover = false" :class='{
                "cursor-pointer": profile.level !== "sponsor",
                "border border--gray-light": profile.level === "sponsor",
            }'>
                <svg class='w-full align-center' width="36" height="36"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-trophy" /></svg>
                <div class='align-center'>Sponsor</div>
                <div class='align-center txt-s'>&gt; $100</div>

                <div class='col col--12 pt12'>
                    <svg v-if='profile.level === "sponsor"' class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle-check" /></svg>
                    <svg v-else-if='hover === "sponsor"' class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle" /></svg>
                    <svg v-else class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle-dotted" /></svg>
                </div>
            </div>

            <div class='col col--4'>
                <div class='txt-s align-center'>Basic Open Data</div>
                <div class='txt-s align-center'>Rate Limited CDN</div>
            </div>

            <div class='col col--4'>
                <div class='txt-s align-center'>All Basic Features</div>
                <div class='txt-s align-center'>300 Custom Exports / month</div>
            </div>

            <div class='col col--4'>
                <div class='txt-s align-center'>All Backer Features</div>

                <div class='align-center'>
                    <span class='bg-blue-faint color-blue inline-block px6 py3 txt-xs txt-bold round'>Planned</span>
                </div>

                <div class='txt-s align-center'>Fastest Data Access</div>
                <div class='txt-s align-center'>Validated Data</div>
            </div>
        </div>

        <Tokens @err='$emit("err", $event)'/>

        <template v-if='profile.level !== "basic"'>
            <Exports :profile='profile' @err='$emit("err", $event)'/>
        </template>
    </div>
</template>

<script>
import Tokens from './Tokens.vue'
import Exports from '../Exports.vue'

export default {
    name: 'ProfileDefault',
    props: [ 'profile' ],
    data: function() {
        return {
            hover: 'none',
            p: {
                username: this.profile.username,
                email: this.profile.email
            }
        };
    },
    methods: {
        oc: function(level) {
            if (this.profile.level === level) return;
            window.open('https://opencollective.com/openaddresses/contribute', "_blank");
        },
    },
    components: {
        Tokens,
        Exports
    }
}
</script>
