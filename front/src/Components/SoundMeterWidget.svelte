<script lang="typescript">
    export let volume = 0;
    let display = true;
</script>

<div class="sound-progress" class:active={display}>
    <span class:active={volume > 5} />
    <span class:active={volume > 10} />
    <span class:active={volume > 15} />
    <span class:active={volume > 40} />
    <span class:active={volume > 70} />
</div>
