<script lang="ts">
    import type { Readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import { createMentionPill, findMentionQuery, type MentionCandidate, ROOM_MENTION_ID } from "../../Mentions";

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

    /** Called by the input before its own handling: returns true when the key drove the suggestions. */
    export function handleKeydown(event: KeyboardEvent): boolean {
        if (matches.length === 0) {
            return false;
        }
        switch (event.key) {
            case "ArrowDown":
                activeIndex = (activeIndex + 1) % matches.length;
                break;
            case "ArrowUp":
                activeIndex = (activeIndex - 1 + matches.length) % matches.length;
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
        const close = () => {
            query = undefined;
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
    <ul
        class="absolute bottom-full left-0 z-50 m-0 mb-1 w-full list-none rounded-lg bg-contrast/95 p-1 backdrop-blur"
        role="listbox"
        aria-label={$LL.chat.mentionSuggestions()}
        data-testid="mentionSuggestions"
    >
        {#each matches as candidate, index (candidate.id)}
            <!-- mousedown, not click: the input must keep the focus and the caret. -->
            <li
                role="option"
                aria-selected={index === activeIndex}
                class="cursor-pointer truncate rounded px-3 py-1.5 text-sm text-white {index === activeIndex
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'}"
                onmousedown={(event) => {
                    event.preventDefault();
                    insert(candidate);
                }}
            >
                @{candidate.name}
                {#if candidate.id === ROOM_MENTION_ID}
                    <span class="ms-2 text-xs text-white/60">{$LL.chat.mentionRoom()}</span>
                {/if}
            </li>
        {/each}
    </ul>
{/if}
