<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { IconX, IconSearch } from "@wa-icons";
    export let hasSearch;
    export let hasCloseChat;
    export let searchActive = false;

    let menuOpen = false;

    type Events = {
        toggleSearch: void;
    };

    const dispatch = createEventDispatcher<Events>();

    function closeChat() {
        chatVisibilityStore.set(false);
        menuOpen = false;
    }

    function toggleMenu() {
        menuOpen = !menuOpen;
    }

    function handleToggleSearch() {
        dispatch("toggleSearch");
        menuOpen = false;
    }
</script>

{#if hasSearch && hasCloseChat}
    <div class="chat-action-menu end-2 top-2 z-50">
        {#if searchActive}
            <button
                class="p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 relative z-50"
                on:click={handleToggleSearch}
            >
                <IconX font-size="20" />
            </button>
        {:else}
            <button
                class="p-2 mt-2 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center text-white"
                on:click={toggleMenu}
                aria-label="Menu actions"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="stroke-white icon icon-tabler icon-tabler-square-chevron-down transition-transform {menuOpen
                        ? 'rotate-180'
                        : ''}"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M15 11l-3 3l-3 -3" />
                    <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
                </svg>
            </button>
        {/if}

        {#if menuOpen && !searchActive}
            <div
                class="absolute top-full right-0 mt-2 bg-contrast/20 backdrop-blur-md rounded-l shadow-lg p-1 min-w-[140px] z-50"
            >
                <button
                    class="menu-item w-full flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-white text-left transition-colors"
                    on:click={handleToggleSearch}
                >
                    {#if searchActive}
                        <IconX font-size="20" />
                    {:else}
                        <IconSearch font-size="20" />
                    {/if}
                    <span class="text-sm">
                        {searchActive ? $LL.chat.closeSearch() : $LL.chat.search()}
                    </span>
                </button>

                <button
                    class="menu-item w-full flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-white text-left transition-colors"
                    data-testid="closeChatButton"
                    on:click={closeChat}
                >
                    <IconX font-size="18" />
                    <span class="text-sm">{$LL.chat.closeChat()}</span>
                </button>
            </div>
        {/if}
    </div>
{:else if hasSearch && !hasCloseChat}
    <button class="p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 relative z-50" on:click={handleToggleSearch}>
        {#if !searchActive}
            <IconSearch font-size="20" />
        {:else}
            <IconX font-size="20" />
        {/if}
    </button>
{:else if !hasSearch && hasCloseChat}
    <button class="p-3 hover:bg-white/10 rounded aspect-square w-12 h-12 relative z-50" on:click={closeChat}>
        <IconX font-size="20" />
    </button>
{/if}

{#if menuOpen && !searchActive}
    <div
        class="fixed inset-0 z-40"
        on:click={() => (menuOpen = false)}
        on:keydown={(e) => e.key === "Escape" && (menuOpen = false)}
        role="button"
        tabindex="-1"
    />
{/if}
