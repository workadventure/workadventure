<script>
    export let src;
    export let alt;
    export let fallback;
    export let classes;

    let currentSrc;

    function handleError() {
        if (currentSrc !== fallback) {
            currentSrc = fallback;
        }
    }

    $: currentSrc = src ?? fallback;
</script>

<img class={classes} src={currentSrc} {alt} on:error={handleError} />
