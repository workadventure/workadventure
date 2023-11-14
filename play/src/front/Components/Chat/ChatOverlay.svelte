<script>
    import Message from "./Message.svelte";
</script>

<div class="overlay-chat relative min-h-[20vh] max-w-[300px] opacity-80 hover:opacity-100 transition-all z-[1]">
    <Message message="Yes..." />
    <Message message="OK cool :)" />
    <Message message="Non" />
    <Message message="La forme ?" />
    <Message message="Salut gros :)" />
    <Message message="Hello !" />
</div>
<style lang="scss">
  .overlay-chat {
    -webkit-mask-image: -webkit-gradient(linear, left 75%, left bottom, from(rgba(0,0,0,1)), to(rgba(0,0,0,0)));
    &:hover {
      -webkit-mask-image: none;
    }
  }
</style>