<script lang="ts">
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";
    import { locale } from "../../i18n/i18n-svelte";

    function onClick(callback: () => void) {
        callback();
    }

    function i18n(text: string | number | boolean | undefined): string {
        if (typeof text === "string") {
            if (text.trim().startsWith("{")) {
                try {
                    let textObject = JSON.parse(text);
                    if (textObject[$locale]) {
                        return textObject[$locale];
                    } else if (Object.keys(textObject).length > 0) {
                        // fallback to first value
                        return textObject[Object.keys(textObject)[0]];
                    }
                } catch (err) {
                    //
                }
            }
            return text;
        }
        return "";
    }
</script>

<div class="layout-manager-list">
    {#each $layoutManagerActionStore as action}
        <div class="nes-container is-rounded {action.type}" on:click={() => onClick(action.callback)}>
            <p>{i18n(action.message)}</p>
        </div>
    {/each}
</div>

<style lang="scss">
    div.layout-manager-list {
        pointer-events: auto;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 40px;
        margin: 0 auto;
        padding: 0;
        width: clamp(200px, 20vw, 20vw);

        display: flex;
        flex-direction: column;

        animation: moveMessage 0.5s;
        animation-iteration-count: infinite;
        animation-timing-function: ease-in-out;
    }

    div.nes-container.is-rounded {
        padding: 8px 4px;
        text-align: center;

        font-family: Lato;
        color: whitesmoke;
        background-color: rgb(0, 0, 0, 0.5);

        &.warning {
            background-color: #ff9800eb;
            color: #000;
        }
    }

    @keyframes moveMessage {
        0% {
            bottom: 40px;
        }
        50% {
            bottom: 30px;
        }
        100% {
            bottom: 40px;
        }
    }
</style>
