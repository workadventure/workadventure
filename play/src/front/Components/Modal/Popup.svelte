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

    const titleId = `popup-title-${Math.random().toString(36).slice(2)}`;
    const FOCUSABLE =
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    let dialog: HTMLDivElement | undefined = $state();

    function focusables(): HTMLElement[] {
        if (!dialog) return [];
        return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (element) => element.offsetParent !== null,
        );
    }

    // Keyboard users land on the first field, else on the first footer button (Cancel in our popups), and get
    // their focus back on the element that opened the popup when it closes.
    $effect(() => {
        if (!isOpen || !dialog) return;
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        const firstField = dialog.querySelector<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
        );
        const firstFooterButton = dialog.querySelector<HTMLElement>(".footer button:not([disabled])");
        (firstField ?? firstFooterButton ?? focusables()[0])?.focus();
        return () => {
            if (opener?.isConnected) opener.focus();
        };
    });

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            modals.close();
            return;
        }
        if (event.key !== "Tab") return;
        const elements = focusables();
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
</script>

{#if isOpen}
    <div class="absolute flex items-center justify-center w-full h-full">
        <div
            bind:this={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabindex="-1"
            onkeydown={onKeyDown}
            class="bg-contrast/75 backdrop-blur-md text-white z-[2001] w-[90%] m-auto left-0 right-0 sm:max-w-[668px] rounded-3xl max-h-full overflow-y-auto pointer-events-auto"
            transition:fly={{ y: -1000, delay: 0, duration: 300 }}
        >
            <div class="p-8 flex flex-col justify-center items-center">
                <div class="flex-row flex items-start w-full justify-between gap-4">
                    <div class="p-2" id={titleId}>
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
