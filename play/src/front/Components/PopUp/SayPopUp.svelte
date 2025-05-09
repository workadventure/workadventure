<script lang="ts">
    import { AvailabilityStatus, SayMessageType } from "@workadventure/messages";
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import { popupJustClosed } from "../../Phaser/Game/Say/SayManager";
    import Select from "../Input/Select.svelte";
    import { availabilityStatusStore } from "../../Stores/MediaStore";
    import LL from "../../../i18n/i18n-svelte";
    import Input from "../Input/Input.svelte";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";
    import { IconSend } from "@wa-icons";

    let message = "";
    let messageInput: Input;
    let type: "say" | "think" = "say";

    const dispatch = createEventDispatcher<{ close: void }>();

    function closeBanner() {
        dispatch("close");
    }

    onMount(() => {
        messageInput.focusInput();
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

    function sendMessageOrEscapeLine(keyDownEvent: KeyboardEvent | MouseEvent) {
        if (keyDownEvent instanceof MouseEvent) {
            const messageToSend = message.replace(/<br>/g, "\n");
            sendMessage(messageToSend);
            return;
        }
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
        <ButtonClose on:click={closeBanner} bgColor="bg-constrast" hoverColor="bg-white/20" size="md" />
        <div class="flex-none w-24">
            <Select
                bind:value={type}
                options={[
                    {
                        value: "say",
                        label: $LL.say.type.say(),
                    },
                    {
                        value: "think",
                        label: $LL.say.type.think(),
                    },
                ]}
                extraSelectClass="!mb-0"
            />
        </div>
        <div class="flex flex-row gap-2">
            <!--            <MessageInput-->
            <!--                onKeyDown={sendMessageOrEscapeLine}-->
            <!--                bind:message-->
            <!--                bind:messageInput-->
            <!--                inputClass="message-input flex-grow !m-0 px-1 py-2.5 max-h-36 overflow-auto  h-full rounded-xl wa-searchbar block text-white placeholder:text-base border-light-purple border !bg-transparent resize-none border-none outline-none shadow-none focus:ring-0"-->
            <!--            />-->

            <Input
                onKeyDown={sendMessageOrEscapeLine}
                bind:value={message}
                bind:this={messageInput}
                placeholder={$LL.say.placeholder()}
                extraInputClasses="!mb-0"
                maxlength={100}
            />
            <button
                class="h-10 {message.length > 0
                    ? 'w-10'
                    : 'w-0'} p-0 aspect-square bg-secondary rounded flex items-center justify-center cursor-pointer transition-all"
                on:click={sendMessageOrEscapeLine}
            >
                <IconSend />
            </button>
        </div>
    </div>
    <!--    <div slot="buttons">-->
    <!--            <button-->
    <!--                class="btn btn-secondary w-full !p-0 h-8 items-center btn-sm z-50 pointer-events-auto"-->
    <!--                on:click={sendMessageOrEscapeLine}-->
    <!--            >-->
    <!--                {$LL.say.send()}-->
    <!--                {#if type === "say"}-->
    <!--                    {$LL.say.type.say()}-->
    <!--                {:else}-->
    <!--                    {$LL.say.type.think()}-->
    <!--                {/if}-->
    <!--                {$LL.say.bubble()}-->
    <!--            </button>-->
    <!--    </div>-->
</PopUpContainer>
