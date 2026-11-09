<script lang="ts">
    import type { Readable } from "svelte/store";
    import { defaultColor } from "@workadventure/shared-utils";
    import LL from "../../../../i18n/i18n-svelte";
    import { createMentionPill, findMentionQuery, type MentionCandidate, ROOM_MENTION_ID } from "../../Mentions";
    import Avatar from "../Avatar.svelte";

    interface Props {
        candidates: Readable<readonly MentionCandidate[]>;
        messageInput: HTMLDivElement | undefined;
        onInsert: () => void;
    }

    let { candidates, messageInput, onInsert }: Props = $props();

    const MAX_SUGGESTIONS = 8;

    let query: string | undefined = $state(undefined);
    let activeIndex = $state(0);

    // Accents and case are ignored, so that "@jer" finds Jérôme.
    const normalize = (text: string) =>
        text
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase();

    // $candidates is only read once an "@" is typed: for a Matrix room, subscribing loads the full member list.
    let matches = $derived(
        query === undefined
            ? []
            : $candidates
                  .filter((candidate) =>
                      [candidate.name, ...(candidate.keywords ?? [])].some((word) =>
                          normalize(word).includes(normalize(query ?? "")),
                      ),
                  )
                  .slice(0, MAX_SUGGESTIONS),
    );
    let firstMemberIndex = $derived(matches.findIndex((candidate) => candidate.id !== ROOM_MENTION_ID));
    // The members of the conversation, us included, for the "@room" row. Only computed once the list is shown.
    let everyoneCount = $derived(
        query === undefined ? 0 : $candidates.filter((candidate) => candidate.id !== ROOM_MENTION_ID).length + 1,
    );

    function getCaret(): { node: Text; offset: number } | undefined {
        const selection = window.getSelection();
        const node = selection?.anchorNode;
        if (!selection?.isCollapsed || !(node instanceof Text) || !messageInput?.contains(node)) {
            return undefined;
        }
        return { node, offset: selection.anchorOffset };
    }

    function getTypedQuery(caret: { node: Text; offset: number } | undefined): string | undefined {
        return caret && findMentionQuery(caret.node.data.slice(0, caret.offset));
    }

    function refresh() {
        const next = getTypedQuery(getCaret());
        if (next !== query) {
            activeIndex = 0;
        }
        query = next;
    }

    function insert(candidate: MentionCandidate) {
        const caret = getCaret();
        const typed = getTypedQuery(caret);
        if (!caret || typed === undefined) {
            return;
        }

        // Replace the "@name" being typed by the pill, followed by a space to keep on typing.
        const range = document.createRange();
        range.setStart(caret.node, caret.offset - typed.length - 1);
        range.setEnd(caret.node, caret.offset);
        range.deleteContents();
        const space = document.createTextNode(" ");
        // Insertion happens at the start of the range, hence the reverse order.
        range.insertNode(space);
        range.insertNode(createMentionPill(candidate));
        window.getSelection()?.collapse(space, 1);

        query = undefined;
        onInsert();
    }

    let listElement: HTMLUListElement | undefined = $state();

    // The options are already rendered: keep the one the keyboard reached visible in a long list.
    function scrollActiveIntoView() {
        listElement?.querySelectorAll('[role="option"]')[activeIndex]?.scrollIntoView({ block: "nearest" });
    }

    /** Called by the input before its own handling: returns true when the key drove the suggestions. */
    export function handleKeydown(event: KeyboardEvent): boolean {
        if (matches.length === 0) {
            return false;
        }
        switch (event.key) {
            case "ArrowDown":
                activeIndex = (activeIndex + 1) % matches.length;
                scrollActiveIntoView();
                break;
            case "ArrowUp":
                activeIndex = (activeIndex - 1 + matches.length) % matches.length;
                scrollActiveIntoView();
                break;
            case "Enter":
            case "Tab":
                insert(matches[activeIndex]);
                break;
            case "Escape":
                query = undefined;
                break;
            default:
                return false;
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
    }

    $effect(() => {
        const input = messageInput;
        if (!input) {
            return;
        }
        // input covers typing, pasting and IME; keyup the caret moves. The keys handled above must not reopen or
        // reset the list.
        const onKeyup = (event: KeyboardEvent) => {
            if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) {
                refresh();
            }
        };
        // Chrome also fires blur when the focused input is removed or disabled, which happens while Svelte updates
        // the DOM: writing state there throws state_unsafe_mutation, so close once that update is over.
        const close = () => {
            queueMicrotask(() => {
                query = undefined;
            });
        };
        input.addEventListener("input", refresh);
        input.addEventListener("keyup", onKeyup);
        input.addEventListener("click", refresh);
        input.addEventListener("blur", close);
        return () => {
            input.removeEventListener("input", refresh);
            input.removeEventListener("keyup", onKeyup);
            input.removeEventListener("click", refresh);
            input.removeEventListener("blur", close);
        };
    });
</script>

{#if matches.length > 0}
    <div
        class="absolute bottom-full start-0 end-0 z-50 mx-2 mb-2 overflow-hidden rounded-xl border border-solid border-white/10 bg-contrast shadow-xl"
        data-testid="mentionSuggestions"
    >
        <ul
            bind:this={listElement}
            class="m-0 max-h-80 list-none overflow-y-auto p-1"
            role="listbox"
            aria-label={$LL.chat.mention.suggestions()}
        >
            {#each matches as candidate, index (candidate.id)}
                {@const isRoom = candidate.id === ROOM_MENTION_ID}
                {@const active = index === activeIndex}
                {#if isRoom || index === firstMemberIndex}
                    <li
                        role="presentation"
                        class="px-2 pb-1 pt-2 text-xxs font-bold uppercase tracking-wider text-white/60"
                    >
                        {isRoom ? $LL.chat.mention.notify() : $LL.chat.mention.members()}
                    </li>
                {/if}
                <!-- mousedown, not click: the input must keep the focus and the caret. -->
                <li
                    role="option"
                    aria-selected={active}
                    class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-white {active
                        ? 'bg-secondary'
                        : 'hover:bg-white/10'}"
                    onmousedown={(event) => {
                        event.preventDefault();
                        insert(candidate);
                    }}
                    onmouseenter={() => (activeIndex = index)}
                >
                    {#if isRoom}
                        <div
                            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-1000 text-base font-bold"
                        >
                            @
                        </div>
                        <div class="text-sm font-bold">room</div>
                        <div class="ms-auto truncate text-xs {active ? 'text-white/85' : 'text-white/60'}">
                            {$LL.chat.mention.room({ count: everyoneCount })}
                        </div>
                    {:else}
                        <div class="relative shrink-0">
                            <Avatar
                                compact
                                pictureStore={candidate.pictureStore}
                                fallbackName={candidate.name}
                                color={candidate.color ?? defaultColor}
                            />
                            {#if candidate.online !== undefined}
                                <span
                                    class="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-solid border-contrast {candidate.online
                                        ? 'bg-success'
                                        : 'bg-white/40'}"
                                ></span>
                            {/if}
                        </div>
                        <div
                            class="min-w-0 truncate text-sm font-bold {candidate.online === false && !active
                                ? 'text-white/75'
                                : ''}"
                        >
                            {candidate.name}
                        </div>
                        {#if candidate.online !== undefined}
                            <div class="ms-auto shrink-0 text-xs {active ? 'text-white/85' : 'text-white/60'}">
                                {candidate.online ? $LL.chat.mention.online() : $LL.chat.mention.offline()}
                            </div>
                        {/if}
                    {/if}
                </li>
            {/each}
        </ul>
    </div>
{/if}
