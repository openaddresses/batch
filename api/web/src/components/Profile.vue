<template>
    <div class='col col--12 grid pt24'>
        <div class='col col--12 grid border-b border--gray-light'>
            <div class='col col--12'>

                <h2 v-if='mode === "profile"' class='txt-h4 ml12 pb12 fl'>Profile:</h2>
                <h2 v-else-if='mode === "analytics"' class='txt-h4 ml12 pb12 fl'>Analytics:</h2>
                <h2 v-else-if='mode === "admin"' class='txt-h4 ml12 pb12 fl'>Administration:</h2>

                <div class='fr'>
                    <div v-if='profile.access === "admin"' class='flex-parent-inline'>
                        <button @click='mode = "profile"' :class='{ "btn--stroke": mode !== "profile" }' class='btn btn--s btn--pill btn--pill-hl round mx0'>Profile</button>
                        <button @click='mode = "analytics"' :class='{ "btn--stroke": mode !== "analytics" }' class='btn btn--s btn--pill btn--pill-hc round mx0'>Analytics</button>
                        <button @click='mode = "admin"' :class='{ "btn--stroke": mode !== "admin" }' class='btn btn--s btn--pill btn--pill-hr round mx0'>Admin</button>
                    </div>
                </div>
            </div>
        </div>

        <template v-if='mode === "profile"'>
            <template v-if='loading.profile'>
                <div class='flex-parent flex-parent--center-main w-full'>
                    <div class='flex-child loading py24'></div>
                </div>
            </template>
            <template v-else>
                <div class='col col--12 grid grid--gut12'>
                    <div class='col col--6 pt12'>
                        <label>Username:</label>
                        <input v-model='profile.username' class='input' placeholder='Username'/>
                    </div>
                    <div class='col col--6 pt12'>
                        <label>Email:</label>
                        <input v-model='profile.email' class='input' placeholder='Username'/>
                    </div>
                    <div class='col col--12 clearfix pt12'>
                        <button disabled class='btn btn--stroke btn--gray btn--s round fr'>Update</button>
                    </div>
                </div>

                <div class='col col--12 grid border-b border--gray-light'>
                    <h2 class='txt-h4 ml12 pb12 fl'>Contribution:</h2>
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
                            <svg v-else='!hover' class='w-full align-center' width="18" height="18"><use xlink:href="@tabler/icons/tabler-sprite.svg#tabler-circle-dotted" /></svg>
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
                        <div class='align-center'>
                            <span class='bg-blue-faint color-blue inline-block px6 py3 txt-xs txt-bold round'>Planned</span>
                        </div>

                        <div class='txt-s align-center'>All Basic Features</div>
                        <div class='txt-s align-center'>CSV/Shapefile Export</div>
                    </div>

                    <div class='col col--4'>
                        <div class='align-center'>
                            <span class='bg-blue-faint color-blue inline-block px6 py3 txt-xs txt-bold round'>Planned</span>
                        </div>

                        <div class='txt-s align-center'>All Backer Features</div>
                        <div class='txt-s align-center'>Fastest Data Access</div>
                        <div class='txt-s align-center'>Validated Data</div>
                    </div>
                </div>

            </template>

            <ProfileTokens @err='$emit("err", $event)'/>
        </template>
        <template v-else-if='mode === "analytics"'>
            <ProfileAnalytics
                v-if='profile.access === "admin"'
                @err='$emit("err", $event)'
            />
        </template>
        <template v-else-if='mode === "admin"'>
            <ProfileAdminUser
                v-if='profile.access === "admin"'
                @err='$emit("err", $event)'
            />

            <ProfileAdminCollections
                v-if='profile.access === "admin"'
                @err='$emit("err", $event)'
            />
        </template>
    </div>
</template>

<script>
import ProfileAnalytics from './profile/ProfileAnalytics.vue'
import ProfileAdminUser from './profile/ProfileAdminUser.vue'
import ProfileAdminCollections from './profile/ProfileAdminCollections.vue'
import ProfileTokens from './profile/ProfileTokens.vue'

export default {
    name: 'Profile',
    props: [ ],
    data: function() {
        return {
            mode: 'profile',
            hover: 'none',
            profile: {
                username: '',
                access: '',
                email: '',
                level: ''
            },
            loading: {
                profile: false,
            }
        };
    },
    mounted: function() {
        this.refresh();
    },
    methods: {
        oc: function(level) {
            if (this.profile.level === level) return;
            window.open('https://opencollective.com/openaddresses/contribute', "_blank");
        },
        refresh: function() {
            this.getLogin();
        },
        getLogin: function() {
            const url = new URL(`${window.location.origin}/api/login`);

            fetch(url, {
                method: 'GET'
            }).then((res) => {
                if (!res.ok && res.message) {
                    throw new Error(res.message);
                } else if (!res.ok) {
                    throw new Error('Failed to load profile');
                }
                return res.json();
            }).then((res) => {
                this.profile = res;
            }).catch((err) => {
                this.$emit('err', err);
            });
        }
    },
    components: {
        ProfileAnalytics,
        ProfileAdminUser,
        ProfileAdminCollections,
        ProfileTokens
    }
}
</script>
