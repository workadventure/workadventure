<script>
    import Message from "./Message.svelte";
</script>

<div class="overlay-chat relative min-h-[20vh] max-h-[calc(100vh-96px)] max-w-[300px] opacity-80 hover:opacity-100 transition-all z-[1] mt-3 pointer-events-none">
    <Message message="Yes..." />
    <Message message="OK cool :)" />
    <Message message="Non" />
    <Message message="La forme ? " />
    <Message message="Salut gros :)" />
    <Message message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." />
    <Message message="Non" />
    <Message message="La forme ? " />
    <Message message="Salut gros :)" />
    <Message message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." />
    <Message message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." />
</div>
<style lang="scss">
  .overlay-chat {
    -webkit-mask-image: -webkit-gradient(linear, left 50%, left bottom, from(rgba(0,0,0,1)), to(rgba(0,0,0,0)));
    &:hover {
      -webkit-mask-image: none;
    }
  }
</style>