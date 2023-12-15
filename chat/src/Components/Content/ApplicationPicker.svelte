<script lang="ts">
    import { createEventDispatcher } from "svelte";

    interface Application {
        name: string;
        icon: string;
        example: string;
        link?: string;
        error?: string;
    }

    const dispatch = createEventDispatcher();
    export let applications: Set<Application>;
    export let _class: string = "";
    export let _style: string = "";

    function addNewApp(app: Application) {
        dispatch("addNewApp", app);
    }
</script>

<div
    class={`actions tw-absolute tw-bottom-0 tw-mb-16 tw-flex tw-flex-col tw-items-center tw-w-auto tw-left-4 ${_class}`}
    style={_style}
>
    {#each [...applications] as app (app.name)}
        <button
            class="action btn-app tw-cursor-pointer tw-flex tw-flex-row tw-justify-center"
            on:keydown
            on:keyup
            on:click|stopPropagation|preventDefault={() => addNewApp(app)}
        >
            <img src={app.icon} alt={`App ${app.name} iniated in the chat`} width="20px" />
            <div class="caption">{app.name}</div>
        </button>
    {/each}
</div>

<style lang="scss">
    button.btn-app {
        margin: 0px;
        height: 2.5rem;
        width: 2.5rem;
        border-radius: 0px;
        background-color: rgb(27 27 41 / 0.95);
        padding-left: 0.5rem;
        padding-right: 0.5rem;
        margin-bottom: 2px;
        outline: 2px solid transparent;
        outline-offset: 2px;
        border-radius: 14px;
    }
    button:disabled {
        opacity: 0.5;
        cursor: url("/static/images/no-app.png"), auto;
        * {
            cursor: url("./static/images/no-app.png"), auto;
        }
    }

    .actions {
        .action {
            cursor: pointer;
            opacity: 0.8;
            position: relative;
            .caption {
                @apply tw-absolute tw-bg-dark-blue tw-text-sm tw-px-2 tw-py-1 tw-rounded-xl tw-border-lighter-purple tw-border tw-border-solid;
                display: none;
                top: 5px;
                left: 54px;
                z-index: 10;
                width: max-content;
                &::before {
                    @apply tw-absolute tw-border-lighter-purple;
                    left: -18px;
                    top: 40%;
                    content: "";
                    width: 0;
                    height: 0;
                    border-left: 9px solid transparent;
                    border-right: 9px solid transparent;
                    border-top-width: 6px;
                    border-top-style: solid;
                    transform: rotate(90deg);
                }
                &::after {
                    @apply tw-absolute tw-border-dark-blue;
                    left: -16px;
                    top: 40%;
                    content: "";
                    width: 0;
                    height: 0;
                    border-left: 7px solid transparent;
                    border-right: 7px solid transparent;
                    border-top-width: 5px;
                    border-top-style: solid;
                    transform: rotate(90deg);
                }
            }
            &:hover {
                opacity: 1;
                .caption {
                    display: block;
                }
            }
        }
        &:hover {
            .actions {
                visibility: visible;
            }
        }
    }
</style>
