<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { useParams } from "svelte-navigator";

  import { selectServer, servers } from "~/store";
  import { api } from "~/lib/ipc";

  const params = useParams();

  params.subscribe((_params) => {
    selectServer(_params.id);
  });

  onDestroy(async () => {
    await api.showLocalApp();
  });

  $: server = $servers.find(({ _id }) => _id === $params.id);
</script>

<div class="hidden m-auto text-gray-400">Server: "{server.name}"</div>