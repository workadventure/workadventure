
<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let property : any;

    const dispatch = createEventDispatcher();

    function onValueChange()
    {
        dispatch('change');
    }
</script>
<div class="value-input"><label for="roomName">Room name</label><input id="roomName" type="text" bind:value={property.roomName} on:change={onValueChange}/></div>
<div class="value-input"><label for="jitsiButtonLabel">Button Label</label><input id="jitsiButtonLabel" type="text" bind:value={property.buttonLabel} on:change={onValueChange}/></div>

<style lang="scss">
    .value-input{

        display:flex;
        width:100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        align-items: center;
        label{
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input{
            flex-grow: 1;
            min-width: 0;
        }
        *{
            margin-bottom: 0;
        }
    }
</style>