<script lang="ts">
    import Quill from "quill";
    import { onDestroy, onMount } from "svelte";
    import { menuInputFocusStore } from "../../Stores/MenuInputFocusStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { AdminMessageEventTypes } from "../../Connection/AdminMessagesService";
    import type { PlayGlobalMessageInterface } from "../../Connection/ConnexionModels";
    import { LL } from "../../../i18n/i18n-svelte";

    //toolbar
    const toolbarOptions = [
        ["bold", "italic", "underline", "strike"], // toggled buttons
        ["blockquote", "code-block"],

        [{ header: 1 }, { header: 2 }], // custom button values
        [{ list: "ordered" }, { list: "bullet" }],
        [{ script: "sub" }, { script: "super" }], // superscript/subscript
        [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
        [{ direction: "rtl" }], // text direction

        [{ size: ["small", false, "large", "huge"] }], // custom dropdown
        [{ header: [1, 2, 3, 4, 5, 6, false] }],

        [{ color: [] }, { background: [] }], // dropdown with defaults from theme
        [{ font: [] }],
        [{ align: [] }],

        ["clean"], // remove formatting button

        ["link", "image", "video"],
    ];

    const gameScene = gameManager.getCurrentGameScene();
    const MESSAGE_TYPE = AdminMessageEventTypes.admin;
    let quill: Quill;
    let QUILL_EDITOR: HTMLDivElement;

    export const handleSending = {
        sendTextMessage(broadcastToWorld: boolean) {
            if (gameScene == undefined) {
                return;
            }
            const text = JSON.stringify(quill.getContents(0, quill.getLength()));

            const textGlobalMessage: PlayGlobalMessageInterface = {
                type: MESSAGE_TYPE,
                content: text,
                broadcastToWorld: broadcastToWorld,
            };

            quill.deleteText(0, quill.getLength());
            gameScene.connection?.emitGlobalMessage(textGlobalMessage);
        },
    };

    //Quill
    onMount(() => {
        quill = new Quill(QUILL_EDITOR, {
            placeholder: $LL.menu.globalMessage.enter(),
            theme: "snow",
            modules: {
                toolbar: toolbarOptions,
            },
        });
        menuInputFocusStore.set(true);
    });

    onDestroy(() => {
        menuInputFocusStore.set(false);
    });
</script>

<section class="section-input-send-text test">
    <div class="input-send-text" role="textbox" bind:this={QUILL_EDITOR} />
</section>

<style lang="scss">
    @import "../../style/breakpoints.scss";
    @import "quill/dist/quill.snow.css";

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

    @include media-breakpoint-up(md) {
        section.section-input-send-text {
            --height-toolbar: 30%;

            :global(.ql-toolbar) {
                overflow: auto;
            }
        }
    }
</style>
