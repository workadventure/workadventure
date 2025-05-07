<script lang="ts">
    import { getContext } from "svelte";
    import { audioManagerVisibilityStore } from "../../../Stores/AudioManagerStore";
    import { silentStore } from "../../../Stores/MediaStore";
    import { bottomActionBarVisibilityStore } from "../../../Stores/BottomActionBarStore";
    import LL from "../../../../i18n/i18n-svelte";
    import AppsMenuItem from "./AppsMenuItem.svelte";
    import FollowMenuItem from "./FollowMenuItem.svelte";
    import EmojiMenuItem from "./EmojiMenuItem.svelte";
    import LockDiscussionMenuItem from "./LockDiscussionMenuItem.svelte";
    import MusicMenuItem from "./MusicMenuItem.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";

    const inProfileMenu = getContext("profileMenu");

    // These menu items are displayed to the left of the camera/microphone icons.
    // They switch automatically to the profile menu when the screen is small.
</script>

{#if inProfileMenu && (($audioManagerVisibilityStore !== "hidden" && !$silentStore) || $bottomActionBarVisibilityStore)}
    <HeaderMenuItem label={$LL.menu.sub.contextualActions()} />
{/if}

{#if $audioManagerVisibilityStore !== "hidden" && !$silentStore}
    <MusicMenuItem />
{/if}

{#if !inProfileMenu}
    <EmojiMenuItem />
    <AppsMenuItem />
{/if}

{#if $bottomActionBarVisibilityStore}
    <!-- <ChangeLayoutMenuItem /> -->

    <FollowMenuItem />
    <LockDiscussionMenuItem />
{/if}

{#if inProfileMenu}
    <!-- In the profile menu, the apps submenu is displayed at the end (because it contains a heading) -->
    <AppsMenuItem />
{/if}
