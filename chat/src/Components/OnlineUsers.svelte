<script lang="ts">
    import { derived, get } from "svelte/store";
    import { UsersStore } from "../Xmpp/MucRoom";
    import { LL } from "../i18n/i18n-svelte";

    export let presenceStore: UsersStore;
    const usersCount = derived(presenceStore, () => $presenceStore.filter((user) => get(user).active).length);
</script>

<div class={`text-xs ${$usersCount > 0 ? "text-pop-green" : "text-lighter-purple"} mt-0`}>
    <b>{$usersCount}</b>
    {$usersCount > 1 ? $LL.usersOnline() : $LL.userOnline()}
</div>
