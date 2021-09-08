<script lang="ts">
    import { consoleGlobalMessageManagerFocusStore, consoleGlobalMessageManagerVisibleStore } from "../../Stores/ConsoleGlobalMessageManagerStore";
    import {onDestroy, onMount} from "svelte";
    import type { GameManager } from "../../Phaser/Game/GameManager";
    import { AdminMessageEventTypes } from "../../Connexion/AdminMessagesService";
    import type { Quill } from "quill";
    import type { PlayGlobalMessageInterface } from "../../Connexion/ConnexionModels";

    //toolbar
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block'],

        [{'header': 1}, {'header': 2}],               // custom button values
        [{'list': 'ordered'}, {'list': 'bullet'}],
        [{'script': 'sub'}, {'script': 'super'}],      // superscript/subscript
        [{'indent': '-1'}, {'indent': '+1'}],          // outdent/indent
        [{'direction': 'rtl'}],                         // text direction

        [{'size': ['small', false, 'large', 'huge']}],  // custom dropdown
        [{'header': [1, 2, 3, 4, 5, 6, false]}],

        [{'color': []}, {'background': []}],          // dropdown with defaults from theme
        [{'font': []}],
        [{'align': []}],

        ['clean'],

        ['link', 'image', 'video']
        // remove formatting button
    ];

    export let gameManager: GameManager;

    const gameScene = gameManager.getCurrentGameScene();
    let quill: Quill;
    let INPUT_CONSOLE_MESSAGE: HTMLDivElement;

    const MESSAGE_TYPE = AdminMessageEventTypes.admin;

    export const handleSending = {
        sendTextMessage(broadcastToWorld: boolean) {
            if (gameScene == undefined) {
                return;
            }
            const text = JSON.stringify(quill.getContents(0, quill.getLength()));

            const textGlobalMessage: PlayGlobalMessageInterface = {
                type: MESSAGE_TYPE,
                content: text,
                broadcastToWorld: broadcastToWorld
            };

            quill.deleteText(0, quill.getLength());
            gameScene.connection?.emitGlobalMessage(textGlobalMessage);
            disableConsole();
        }
    }

    //Quill
    onMount(async () => {

        // Import quill
        const {default: Quill} = await import("quill"); // eslint-disable-line @typescript-eslint/no-explicit-any

        quill = new Quill(INPUT_CONSOLE_MESSAGE, {
            placeholder: 'Enter your message here...',
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            },
        });

        consoleGlobalMessageManagerFocusStore.set(true);
    });

    onDestroy(() => {
        consoleGlobalMessageManagerFocusStore.set(false);
    })

    function disableConsole() {
        consoleGlobalMessageManagerVisibleStore.set(false);
        consoleGlobalMessageManagerFocusStore.set(false);
    }
</script>

<section class="section-input-send-text">
    <div class="input-send-text" bind:this={INPUT_CONSOLE_MESSAGE}></div>
</section>


<style lang="scss">
  @import 'https://cdn.quilljs.com/1.3.7/quill.snow.css';
</style>
