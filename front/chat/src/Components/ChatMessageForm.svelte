<script lang="ts">
    import { SendIcon } from "svelte-feather-icons";
    import {ChatStates, MucRoom} from "../Xmpp/MucRoom";
    import LL from "../i18n/i18n-svelte";

    export let mucRoom: MucRoom;

    let newMessageText = "";

    function onFocus() {
    }
    function onBlur() {
        mucRoom.updateComposingState(ChatStates.PAUSED);
    }

    function sendMessage() {
        if (!newMessageText) return;
        mucRoom.updateComposingState(ChatStates.PAUSED);
        mucRoom.sendMessage(newMessageText);
        //chatMessagesStore.addPersonnalMessage(newMessageText);
        newMessageText = "";
    }
</script>

<form on:submit|preventDefault={sendMessage}>
    <div class="tw-w-full tw-p-2">
        <div
            class="tw-flex tw-items-center tw-relative"
        >
            <textarea
                type="text"
                bind:value={newMessageText}
                class="tw-flex-1 tw-text-sm tw-ml-2 tw-bg-transparent tw-outline-1 focus:tw-ring-1 tw-mb-0 tw-min-h-[35px] tw-border-0 tw-resize-none placeholder:tw-italic placeholder:tw-text-light-purple"
                placeholder={$LL.enterText()}
                on:focus={onFocus}
                on:blur={onBlur}
                on:keypress={() => mucRoom.updateComposingState(ChatStates.COMPOSING)}
                rows="1"
                style="margin-bottom: 0;"
            />
            <button
                type="submit"
                class="tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 tw-text-light-blue"
                on:click={sendMessage}
            >
                <SendIcon size="17" />
            </button>
        </div>
    </div>
</form>

<style lang="scss">
    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;

        // button {
        //     background-color: #254560;
        //     border-bottom-right-radius: 4px;
        //     border-top-right-radius: 4px;
        //     border: none;
        //     border-left: solid white 1px;
        //     font-size: 16px;
        // }
    }
</style>
