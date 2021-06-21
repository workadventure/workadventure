<script lang="ts">
    import {ConsoleGlobalMessageManagerFocusStore, ConsoleGlobalMessageManagerVisibleStore } from "../../Stores/ConsoleGlobalMessageManagerStore";
    import {onMount} from "svelte";
    import {Game} from "../../Phaser/Game/Game";
    import {GameManager} from "../../Phaser/Game/GameManager";
    import type {PlayGlobalMessageInterface} from "../../Connexion/ConnexionModels";
    import {AdminMessageEventTypes} from "../../Connexion/AdminMessagesService";

    //toolbar
    export const toolbarOptions = [
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

    export let game: Game;
    export let gameManager: GameManager;


    let gameScene = game.scene.getScene(gameManager.currentGameSceneName);
    let quill;
    let INPUT_CONSOLE_MESSAGE = 'quill';

    const MESSAGE_TYPE = AdminMessageEventTypes.admin;

    //Quill
    onMount(async () => {

        // Import quill
        const {default: Quill} = await import("quill"); // eslint-disable-line @typescript-eslint/no-explicit-any

        quill = new Quill(INPUT_CONSOLE_MESSAGE, {
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            },
        });

        quill.on('selection-change', function (range, oldRange, source) {
            if (range === null && oldRange !== null) {
                ConsoleGlobalMessageManagerFocusStore.set(false);
            } else if (range !== null && oldRange === null)
                ConsoleGlobalMessageManagerFocusStore.set(true);
        });
    });

    function disableConsole() {
        ConsoleGlobalMessageManagerVisibleStore.set(false);
        ConsoleGlobalMessageManagerFocusStore.set(false);
    }

    function SendTextMessage() {
        const elements = document.getElementsByClassName('ql-editor');
        const quillEditor = elements.item(0);
        if (!quillEditor) {
            throw "Error get quill node";
        }
        const GlobalMessage: PlayGlobalMessageInterface = {
            id: "1", // FIXME: use another ID?
            message: quillEditor.innerHTML,
            type: MESSAGE_TYPE
        };
        quillEditor.innerHTML = '';
        gameScene.connection.emitGlobalMessage(GlobalMessage);
        disableConsole();
    }
</script>


<section class="section-input-send-text">
    <div class="input-send-text" bind:this={INPUT_CONSOLE_MESSAGE}></div>
    <div class="btn-action">
        <button class="nes-btn is-primary" on:click|preventDefault={SendTextMessage}>Send</button>
    </div>
</section>


<style lang="scss">
  @import 'https://cdn.quilljs.com/1.3.7/quill.snow.css';
</style>
