<script lang="ts">
    import { UsersStore } from "../Xmpp/MucRoom";
    import LL from "../i18n/i18n-svelte";

    export let usersListStore: UsersStore;
</script>

<div
    class={`tw-text-xs ${
        [...$usersListStore].filter(([, user]) => user.active).length > 0 ? "tw-text-green" : "tw-text-lighter-purple"
    } tw-mt-0`}
>
    <b>{[...$usersListStore].filter(([, user]) => user.active).length}</b>
    {[...$usersListStore].filter(([, user]) => user.active).length > 1 ? $LL.usersOnline() : $LL.userOnline()}
</div>
