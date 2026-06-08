<script lang="ts">
    import type { Snippet } from "svelte";
    import { fly } from "svelte/transition";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen?: boolean;
        withAction?: boolean;
        title?: Snippet;
        content?: Snippet;
        action?: Snippet;
    }

    let { isOpen = false, withAction = true, title, content, action }: Props = $props();
</script>

{#if isOpen}
    <div class="absolute flex items-center justify-center w-full h-full">
        <div
            class="bg-contrast/75 backdrop-blur-md text-white z-[2001] w-[90%] m-auto left-0 right-0 sm:max-w-[668px] rounded-3xl max-h-full overflow-y-auto pointer-events-auto"
            transition:fly={{ y: -1000, delay: 0, duration: 300 }}
        >
            <div class="p-8 flex flex-col justify-center items-center">
                <div class="flex-row flex items-start w-full justify-between gap-4">
                    <div class="p-2">
                        {@render title?.()}
                    </div>
                    <div>
                        <ButtonClose
                            dataTestId="closeModal"
                            onclick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                modals.close();
                            }}
                        />
                    </div>
                </div>
                {@render content?.()}
            </div>
            {#if withAction}
                <div
                    class="footer flex flex-row justify-evenly items-center bg-contrast w-full p-4 gap-3 rounded-b-3xl"
                >
                    {@render action?.()}
                </div>
            {/if}
        </div>
    </div>
{/if}
