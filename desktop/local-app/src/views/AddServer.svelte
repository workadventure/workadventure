<script lang="ts">
    import InputField from "~/lib/InputField.svelte";
    import TextInput from "~/lib/TextInput.svelte";

    import { newServer, addServer } from "~/store";

    let error = "";
    async function _addServer() {
        try {
            await addServer();
        } catch (e) {
            console.log(e);
            error = e.message;
        }
    }
</script>

<div class="flex w-full h-full justify-center items-center">
    <form class="flex flex-col justify-center" on:submit|preventDefault={_addServer}>
        <InputField title="Name" id="name">
            <TextInput bind:value={$newServer.name} required id="name" />
        </InputField>
        <InputField title="Url" id="url">
            <TextInput bind:value={$newServer.url} required id="url" />
        </InputField>
        {#if error}
            <div class="text-red-500 text-center mb-2">{error}</div>
        {/if}
        <input
            type="submit"
            value="Add server"
            class="mt-4 rounded-md p-2 bg-gray-300 cursor-pointer hover:bg-gray-400"
        />
    </form>
</div>
