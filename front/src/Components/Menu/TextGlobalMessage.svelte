<script lang="ts">
    import { menuInputFocusStore } from "../../Stores/MenuStore";
    import { onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { AdminMessageEventTypes } from "../../Connexion/AdminMessagesService";
    import type { Quill } from "quill";
    import type { PlayGlobalMessageInterface } from "../../Connexion/ConnexionModels";
    import LL from "../../i18n/i18n-svelte";

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
    onMount(async () => {
        // Import quill
        const { default: Quill } = await import("quill"); // eslint-disable-line @typescript-eslint/no-explicit-any

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

<section class="section-input-send-text">
    <div class="input-send-text" bind:this={QUILL_EDITOR} />
</section>

<style lang="scss">
    @import "https://cdn.quilljs.com/1.3.7/quill.snow.css";
</style>
