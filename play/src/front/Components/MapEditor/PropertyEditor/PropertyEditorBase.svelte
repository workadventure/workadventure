<script>
    import { createEventDispatcher, onDestroy } from "svelte";
    import { inputFormFocusStore } from "../../../Stores/UserInputStore";
    import CloseButton from "./CloseButton.svelte";

    const dispatch = createEventDispatcher();

    onDestroy(() => {
        inputFormFocusStore.set(false);
    });
</script>

<div class="property-settings-container">
    <div class="header">
        <slot name="header">_MISSING_</slot>
        <CloseButton
            on:click={() => {
                dispatch("close");
            }}
        />
    </div>
    <div class="content tw-p-2">
        <slot name="content">No content</slot>
    </div>
</div>

<style lang="scss">
    .property-settings-container {
        border-radius: 5px;
        padding: 5px;

        .header {
            display: flex;
            font-size: 25px;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }

        .content {
            border-left-width: 1px;
            border-left-style: solid;
            --tw-border-opacity: 1;
            border-color: rgb(77 75 103 / var(--tw-border-opacity));
        }
    }
    :global(.value-input) {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
    :global(.value-switch) {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        align-items: center;
        height: 2.5em;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
            flex-grow: 1;
        }
        input.input-switch {
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
    :global(.value-switch input.input-switch) {
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
        border-radius: 9999px;
        border-width: 1px;
        border-style: solid;
        --tw-border-opacity: 1;
        border-color: rgb(77 75 103 / var(--tw-border-opacity));
        --tw-bg-opacity: 1;
        background-color: rgb(15 31 45 / var(--tw-bg-opacity));
        background-image: none;
        padding: 0px;
        --tw-text-opacity: 1;
        color: rgb(242 253 255 / var(--tw-text-opacity));
        outline: 2px solid transparent;
        outline-offset: 2px;
        cursor: url(/src/front/style/images/cursor_pointer.png), pointer;
        margin-left: 8px;
        margin-top: -6px;

        &::before {
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

        &:checked {
            --tw-border-opacity: 1;
            border-color: rgb(146 142 187 / var(--tw-border-opacity));
        }

        &:checked::before {
            left: 13px;
            top: -3px;
            --tw-bg-opacity: 1;
            background-color: rgb(65 86 246 / var(--tw-bg-opacity));
            content: var(--tw-content);
            /*--tw-shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
        --tw-shadow-colored: 0 0 7px 0 var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);*/
        }

        &:disabled {
            cursor: not-allowed;
            opacity: 0.4;
        }
    }
</style>
