<script lang="ts">
    import Quill from "quill";
    import { onDestroy, onMount } from "svelte";
    import { menuInputFocusStore } from "../../Stores/MenuInputFocusStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { PlayGlobalMessageInterface } from "../../Connection/ConnexionModels";
    import { LL } from "../../../i18n/i18n-svelte";

    // A reduced toolbar: an announcement is a few lines, not a page.
    const toolbarOptions = [["bold", "italic"], ["link"], [{ list: "ordered" }, { list: "bullet" }], ["clean"]];

    const gameScene = gameManager.getCurrentGameScene();
    const MESSAGE_TYPE = "message";
    let quill: Quill;
    let QUILL_EDITOR: HTMLDivElement | undefined = $state();

    export type TextGlobalMessageHandle = {
        sendTextMessage(broadcastToWorld: boolean, joinUrl?: string): void;
    };

    interface Props {
        handleSending?: TextGlobalMessageHandle;
        /** Called with the Quill delta (as JSON) on every change, or "" when the editor is empty. */
        onchange?: (delta: string) => void;
    }

    let { handleSending = $bindable(), onchange }: Props = $props();

    handleSending = {
        sendTextMessage(broadcastToWorld: boolean, joinUrl = "") {
            if (gameScene == undefined) {
                return;
            }
            const text = JSON.stringify(quill.getContents(0, quill.getLength()));

            const textGlobalMessage: PlayGlobalMessageInterface = {
                type: MESSAGE_TYPE,
                content: text,
                broadcastToWorld: broadcastToWorld,
                joinUrl,
            };

            quill.deleteText(0, quill.getLength());
            gameScene.connection?.emitGlobalMessage(textGlobalMessage);
        },
    };

    function onTextChange() {
        onchange?.(quill.getText().trim() === "" ? "" : JSON.stringify(quill.getContents()));
    }

    //Quill
    onMount(() => {
        if (!QUILL_EDITOR) {
            return;
        }
        quill = new Quill(QUILL_EDITOR, {
            placeholder: $LL.menu.globalMessage.enter(),
            theme: "snow",
            // Also what a paste may bring in: the toolbar alone does not restrict it.
            formats: ["bold", "italic", "link", "list"],
            modules: {
                toolbar: toolbarOptions,
            },
        });
        quill.on("text-change", onTextChange);
        menuInputFocusStore.set(true);
    });

    onDestroy(() => {
        quill?.off("text-change", onTextChange);
        menuInputFocusStore.set(false);
    });
</script>

<section class="section-input-send-text test">
    <div class="input-send-text" role="textbox" bind:this={QUILL_EDITOR}></div>
</section>

<style>
    section.section-input-send-text {
        --height-toolbar: 20%;
        height: 100%;

        :global(.ql-editor) {
            background-color: #1b2a41;
        }
        :global(.ql-toolbar.ql-snow .ql-picker-label) {
            color: whitesmoke;
        }

        :global(.ql-toolbar .ql-stroke) {
            fill: none;
            stroke: #fff;
        }

        :global(.ql-toolbar .ql-fill) {
            fill: #fff;
            stroke: none;
        }

        :global(.ql-toolbar.ql-snow .ql-formats button) {
            color: whitesmoke; /* Droprown label text color */
        }

        :global(.ql-container) {
            background-color: #1b2a41;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
            border: 1px solid #879fc2;
            color: whitesmoke;
        }
        :global(.ql-toolbar) {
            max-height: var(--height-toolbar);
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
        }

        :global(.ql-editor) {
            text-align: start;
        }

        div.input-send-text {
            height: calc(100% - var(--height-toolbar));
            overflow: auto;

            font-size: 1rem;

            :global(.ql-editor.ql-blank::before) {
                color: whitesmoke;
                font-size: 1rem;
            }

            :global(.ql-tooltip) {
                top: 40% !important;
                inset-inline-start: 20% !important;

                color: whitesmoke;
                background-color: #333333;
            }
        }
    }

    @media only screen and (max-width: 991px) {
        section.section-input-send-text {
            --height-toolbar: 30%;

            :global(.ql-toolbar) {
                overflow: auto;
            }
        }
    }
</style>
