<script>
    import Message from "./Message.svelte";
</script>

<div
    class="group/overlay overlay-chat h-screen max-w-[300px] opacity-80 hover:opacity-100 hover:bg-contrast/50 pt-24 transition-all absolute z-[300] top-0 left-0 pointer-events-auto hidden sm:block"
>
    <!-- Ajouter un hidden pour mieux afficher les screen sharing-->
    <div class="relative h-full hidden">
        <div class="group-hover/overlay:visible invisible flex absolute bottom-0 w-full p-4 bg-contrast ">
            <button class="btn btn-light btn-border btn-sm w-full justify-center mr-4">Show chat</button>
            <!-- trad & TODO -->
            <button class="btn btn-secondary btn-sm w-full justify-center">Clear messages</button>
            <!-- trad & TODO -->
        </div>
        <div class="px-4">
            <Message message="Yes..." />
            <Message message="OK cool :)" />
            <Message message="Non" />
            <Message message="La forme ? " />
            <Message message="Salut gros :)" />
            <Message
                message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
            />
            <Message message="Non" />
            <Message message="La forme ? " />
            <Message message="Salut gros :)" />
            <Message
                message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
            />
            <Message
                message="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
            />
        </div>
    </div>
</div>

<style lang="scss">
    .overlay-chat {
        mask-image: -webkit-gradient(linear, left 50%, left bottom, from(rgba(0, 0, 0, 1)), to(rgba(0, 0, 0, 0)));
        &:hover {
            mask-image: none;
        }
    }
</style>
