<script lang="ts">
    import {fly} from "svelte/transition";
    import {SvelteComponent} from "svelte";
    import LL from "../../../i18n/i18n-svelte";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import {EditorToolName} from "../../Phaser/Game/MapEditor/MapEditorModeManager";
    import Megaphone from "./Megaphone.svelte";

    type Tab = {
        name: string;
        component: SvelteComponent;
    };

    let currentTab: Tab | undefined;

    function close(){
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(EditorToolName.EntityEditor);
    }
</script>
<div class="modal" in:fly={{ x: 100, duration: 250, delay: 200 }} out:fly={{ x: 100, duration: 200 }}>
    <button class="close-window" on:click={close}>&#215;</button>
    <div class="menu">
        <h3>{$LL.mapEditor.sideBar.configureMyRoom()}</h3>
        <ul>
            <li class:selected={currentTab?.name === "megaphone"} on:click={() => currentTab = {name: "megaphone", component: Megaphone}}>Megaphone</li>
        </ul>
    </div>
    <div class="content">
        {#if currentTab}
            <svelte:component this={currentTab.component} />
        {/if}
    </div>
</div>

<style lang="scss">
    .modal{
        @apply tw-rounded-xl tw-bg-dark-blue/90 tw-backdrop-blur tw-flex tw-flex-wrap;
        width: 70vw !important;
        min-height: 60vh;
        height: fit-content !important;
        top: 50%;
        right: 50%;
        transform: translate(-20%, -50%);
        transition: all 100ms ease-in-out;

        .close-window{
            @apply tw-top-1.5 tw-right-2.5;
        }

        h3{
            @apply tw-text-light-blue tw-m-0;
        }

        .menu{
            @apply tw-border-0 tw-border-r tw-border-solid tw-border-lighter-purple/50 tw-w-1/4;
            h3{
                @apply tw-px-5 tw-py-3.5;
            }
            ul{
                @apply tw-list-none tw-m-0 tw-p-0 tw-border-0 tw-border-b tw-border-solid tw-border-lighter-purple/50;
                li{
                    @apply tw-cursor-pointer tw-px-5 tw-py-3 tw-text-lg;
                    &:nth-of-type(1n+1){
                        @apply tw-border-0 tw-border-t tw-border-solid tw-border-lighter-purple/50;
                    }
                    &:hover, &.selected{
                        @apply tw-bg-white/10;
                    }
                    &.selected{
                        @apply tw-font-bold tw-cursor-default;
                    }
                }
            }
        }
        .content {
            @apply tw-px-5 tw-py-3 tw-w-3/4;
        }
    }


    :global(.input-switch) {
        position: relative;
        top: 0px;
        right: 0px;
        bottom: 0px;
        left: 0px;
        display: inline-block;
        height: 1rem;
        width: 2rem;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        border-radius: 9999px !important;
        border-width: 1px;
        border-style: solid;
        --tw-border-opacity: 1;
        border-color: rgb(77 75 103 / var(--tw-border-opacity));
        --tw-bg-opacity: 1;
        background-color: rgb(15 31 45 / var(--tw-bg-opacity));
        padding: 0px;
        --tw-text-opacity: 1;
        color: rgb(242 253 255 / var(--tw-text-opacity));
        outline: 2px solid transparent;
        outline-offset: 2px;
    }
    :global(.input-switch::before) {
        position: absolute;
        left: -3px;
        top: -3px;
        height: 1.25rem;
        width: 1.25rem;
        border-radius: 9999px;
        --tw-bg-opacity: 1;
        background-color: rgb(146 142 187 / var(--tw-bg-opacity));
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 150ms;
        --tw-content: "";
        content: var(--tw-content);
    }

    :global(.input-switch:checked) {
        --tw-border-opacity: 1;
        border-color: rgb(146 142 187 / var(--tw-border-opacity));
        background-image: initial;
    }

    :global(.input-switch:checked::before) {
        left: 13px;
        top: -3px;
        --tw-bg-opacity: 1;
        background-color: rgb(86 234 255 / var(--tw-bg-opacity));
        content: var(--tw-content);
        --tw-shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
        --tw-shadow-colored: 0 0 7px 0 var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    }

    :global(.input-switch:disabled) {
        cursor: not-allowed;
        opacity: 0.4;
    }
</style>