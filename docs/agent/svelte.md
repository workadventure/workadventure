# Svelte Components

```svelte
<script lang="ts">
    import { onDestroy } from "svelte";
    import { errorScreenStore } from "../../Stores/ErrorScreenStore";
    import LL from "../../../i18n/i18n-svelte";

    $: detailsStylized = (details ?? "").replace("{time}", `${timeVar}`);
</script>

{#if $errorScreenStore}
    <main><!-- content --></main>
{/if}

<style lang="scss">
    /* styles */
</style>
```
