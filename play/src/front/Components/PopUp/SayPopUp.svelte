<script lang="ts">
    import { AvailabilityStatus, SayMessageType } from "@workadventure/messages";
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import MessageInput from "../../Chat/Components/Room/MessageInput.svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import { popupJustClosed } from "../../Phaser/Game/Say/SayManager";
    import Select from "../Input/Select.svelte";
    import { availabilityStatusStore } from "../../Stores/MediaStore";
    import PopUpContainer from "./PopUpContainer.svelte";

    let message = "";
    let messageInput: HTMLDivElement;
    let type: "say" | "think" = "say";

    const dispatch = createEventDispatcher();

    function closeBanner() {
        dispatch("close");
    }

    /*function handleClose(); {
        popupStore.removePopup("say");
    }*/

    onMount(() => {
        messageInput.focus();
    });

    $: {
        switch ($availabilityStatusStore) {
            case AvailabilityStatus.JITSI:
            case AvailabilityStatus.BBB:
            case AvailabilityStatus.DENY_PROXIMITY_MEETING:
            case AvailabilityStatus.SPEAKER: {
                type = "say";
                break;
            }
            case AvailabilityStatus.SILENT:
            case AvailabilityStatus.AWAY:
            case AvailabilityStatus.DO_NOT_DISTURB:
            case AvailabilityStatus.BACK_IN_A_MOMENT:
            case AvailabilityStatus.BUSY: {
                type = "think";
                break;
            }
            default: {
                console.warn("Say: unknown status ", $availabilityStatusStore);
                type = "say";
                break;
            }
        }
    }

    onDestroy(() => {
        // Firefox does not trigger the "blur" event when the input is removed from the DOM.
        // So we need to manually set the focus to false when the component is destroyed.
        inputFormFocusStore.set(false);
        // When we press "Enter", since the enter key is the key to open the popup,
        // the popup closes and opens again. We use this lastSayPopupCloseDate trick to
        // prevent the popup from opening again if it just closed.
        popupJustClosed();
    });

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            //handleClose();
            closeBanner();
        } else if (e.key === "Control") {
            // Let's invert the type of the message when the user presses Ctrl.
            type = type === "say" ? "think" : "say";
        }
    };

    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Control") {
            // Let's invert the type of the message when the user presses Ctrl.
            type = type === "say" ? "think" : "say";
        }
    };

    function sendMessageOrEscapeLine(keyDownEvent: KeyboardEvent) {
        if (keyDownEvent.key === "Enter" && keyDownEvent.shiftKey) {
            return;
        }
        if (keyDownEvent.key === "Enter" && !keyDownEvent.shiftKey) {
            keyDownEvent.preventDefault();
        }

        if (keyDownEvent.key === "Enter" && message.trim().length !== 0) {
            // message contains HTML tags. Actually, the only tags we allow are for the new line, ie. <br> tags.
            // We can turn those back into carriage returns.
            const messageToSend = message.replace(/<br>/g, "\n");
            sendMessage(messageToSend);
        }
    }

    function sendMessage(message: string) {
        const gameScene = gameManager.getCurrentGameScene();
        gameScene.sayManager.say(
            message,
            type === "say" ? SayMessageType.SpeechBubble : SayMessageType.ThinkingCloud,
            type === "say" ? 5000 : undefined
        );
        message = "";
        closeBanner();
    }
</script>

<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />
<PopUpContainer reduceOnSmallScreen={true} fullContent={true}>
    <div class="flex flex-row w-full items-center gap-2 min-w-80">
        <div class="flex-none w-24">
            <Select
                bind:value={type}
                options={[
                    {
                        value: "say",
                        label: "Say",
                    },
                    {
                        value: "think",
                        label: "Think",
                    },
                ]}
            />
        </div>
        <div
            class="flex-1 flex w-full flex-none items-center border border-solid border-b-0 border-x-0 border-t-1 border-white/10 bg-contrast/50"
        >
            <MessageInput
                onKeyDown={sendMessageOrEscapeLine}
                bind:message
                bind:messageInput
                inputClass="message-input flex-grow !m-0 px-1 py-2.5 max-h-36 overflow-auto  h-full rounded-xl wa-searchbar block text-white placeholder:text-base border-light-purple border !bg-transparent resize-none border-none outline-none shadow-none focus:ring-0"
            />
        </div>
    </div>
    <svelte:fragment slot="iconButton">
        <button
            class="btn btn-secondary !p-0 w-8 h-8 items-center btn-sm absolute top-2 right-2 z-50 pointer-events-auto"
            on:click={closeBanner}
        >
            <XIcon height="h-4" width="w-4" />
        </button>
    </svelte:fragment>
</PopUpContainer>
