<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let id: string;
    export let value: string = "";

    const dispatch = createEventDispatcher<{
        change: string;
    }>();

    // https://www.electronjs.org/de/docs/latest/api/accelerator
    function keyCodeToElectron(key: string): string {
        if (key.match(/^Key[A-Z]/)) {
            return key.replace(/^Key/, "").toLocaleUpperCase();
        }

        if (key.match(/^Digit[0-9]/)) {
            return key.replace(/^Digit/, "").toLowerCase();
        }

        if (key.match(/^Numpad[0-9]/)) {
            return key.replace(/^Numpad/, "num").toLowerCase();
        }

        switch (key) {
            // Modifiers
            case "ControlLeft":
                return "CmdOrCtrl";
            case "ControlRight":
                return "CmdOrCtrl";
            case "AltLeft":
                return "Alt";
            case "AltRight":
                return "AltGr";
            case "ScrollLock":
                return "Scrolllock";
            case "ShiftLeft":
                return "Shift";
            case "ShiftRight":
                return "Shift";
            // Specialchars
            case "Period":
                return ".";
            case "Comma":
                return ",";
            case "Slash":
                return "/";
            case "Backslash":
                return "\\";
            case "Minus":
                return "-";
            case "Equal":
                return "=";
            case "BracketLeft":
                return "[";
            case "BracketRight":
                return "]";
            case "Quote":
                return "'";
            case "Semicolon":
                return ";";
            case "IntlBackslash":
                return "\\";
            case "Backquote":
                return "`";
            // Numpad
            case "NumpadDecimal":
                return "numdec";
            case "NumpadAdd":
                return "numadd";
            case "NumpadSubtract":
                return "numsub";
            case "NumpadMultiply":
                return "nummult";
            case "NumpadDivide":
                return "numdiv";
            default:
                return key;
        }
    }

    let shortCut: string[] = [];
    let recording = false;
    let recordingTimeout: NodeJS.Timeout;
    let keyInputTimeout: NodeJS.Timeout;

    function camelPad(str: string) {
        return (
            str
                // Look for long acronyms and filter out the last letter
                .replace(/([A-Z]+)([A-Z][a-z])/g, " $1 $2")
                // Look for lower-case letters followed by upper-case letters
                .replace(/([a-z\d])([A-Z])/g, "$1 $2")
                // Look for lower-case letters followed by numbers
                // .replace(/([a-zA-Z])(\d)/g, "$1 $2")
                .replace(/^./, (str) => str.toUpperCase())
                // Remove any white space left around the word
                .trim()
        );
    }

    function resetRecording() {
        recording = false;
        shortCut = [];
        value = "";
        dispatch("change", value);
    }

    function stopRecording() {
        clearTimeout(recordingTimeout);
        recording = false;
        value = shortCut.map(keyCodeToElectron).join(" + ");
        dispatch("change", value);
    }

    function startRecording() {
        if (recording) {
            return;
        }

        recording = true;
        value = "";
        shortCut = [];

        recordingTimeout = setTimeout(() => {
            stopRecording();
        }, 1000 * 5);
    }

    function keyUp(event: KeyboardEvent) {
        if (!recording) {
            return;
        }

        shortCut = [...shortCut, event.code];

        if (!keyInputTimeout) {
            keyInputTimeout = setTimeout(() => {
                stopRecording();
                keyInputTimeout = undefined;
            }, 300);
        }
    }
</script>

<div
    class={`flex items-center w-full h-8 border-1 rounded-md overflow-hidden text-gray-200 text-xs appearance-none focus:outline-none ${
        recording ? "border-red-500" : "border-gray-400"
    }`}
    on:keyup={keyUp}
    on:click={startRecording}
    tabindex="0"
>
    <input
        {id}
        type="text"
        class="flex-grow h-full border-none mx-2 bg-transparent appearance-none focus:outline-none"
        disabled
        {value}
    />
    {#if value.length > 0}
        <span
            class="flex items-center justify-center w-4 h-4 p-2 mr-1 rounded-full cursor-pointer bg-gray-500 hover:bg-gray-400"
            on:click|stopPropagation={resetRecording}>x</span
        >
    {/if}
    <div
        class={`flex h-6 items-center px-2 m-0.5 rounded-sm w-28 justify-center cursor-pointer ${
            recording ? "bg-red-500" : "hover:bg-gray-400"
        }`}
        on:click={recording ? stopRecording : startRecording}
    >
        {#if recording}
            <span>recording</span>
        {:else}
            <span>record</span>
        {/if}
    </div>
</div>
