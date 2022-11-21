<script lang="ts">
    import { UsersStore } from "../Xmpp/MucRoom";
    import LL from "../i18n/i18n-svelte";

    export let presenceStore: UsersStore;
</script>

<div
    class={`tw-text-xs ${
        [...$presenceStore].filter(([, user]) => user.active).length > 0
            ? "tw-text-pop-green"
            : "tw-text-lighter-purple"
    } tw-mt-0`}
>
    <b>{[...$presenceStore].filter(([, user]) => user.active).length}</b>
    {[...$presenceStore].filter(([, user]) => user.active).length > 1 ? $LL.usersOnline() : $LL.userOnline()}
</div>
