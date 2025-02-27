<script lang="ts">
import App from "$lib/Components/App.svelte";
import { e2eHooks } from "$lib/Utils/E2EHooks";

// Initialize E2E hooks
window.e2eHooks = e2eHooks;
</script>

<App />