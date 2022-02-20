<script lang="ts">
import { newServer, addServer } from '../store';
</script>

<div class="flex w-full h-full justify-center items-center">

  <form class="flex flex-col justify-center space-y-2" on:submit|preventDefault={addServer}>
    <input type="text" class="w-full h-12 px-4 py-2 bg-gray-200 rounded-lg" placeholder="Name" required bind:value={$newServer.name}>
    <input type="text" class="w-full h-12 px-4 py-2 bg-gray-200 rounded-lg" placeholder="Url" required bind:value={$newServer.url}>
    <input type="submit" value="Add server" />
  </form>
</div>
