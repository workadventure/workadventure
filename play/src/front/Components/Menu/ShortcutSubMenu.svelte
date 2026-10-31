<script lang="ts">
    import { onMount } from "svelte";
    import {
        getMediaShortcut,
        setMediaShortcut,
        mediaShortcutRebindingStore,
        type MediaShortcut,
        type MediaShortcutAction,
    } from "../../Stores/MediaShortcutStore";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";

    type GroupedShortcut = {
        description: string;
        keys: string[];
    };

    let groupedShortcuts: GroupedShortcut[] = $state([]);
    let mediaShortcuts = $state({ microphone: getMediaShortcut("microphone"), camera: getMediaShortcut("camera") });
    let rebinding: MediaShortcutAction | undefined = $state();

    function shortcutKeyParts(shortcut: MediaShortcut): string[] {
        const modifiers = [
            ...(shortcut.ctrlKey ? ["Ctrl"] : []),
            ...(shortcut.metaKey ? ["⌘"] : []),
            ...(shortcut.altKey ? ["Alt"] : []),
            ...(shortcut.shiftKey ? ["Shift"] : []),
        ];
        const key = shortcut.key.replace(/^(Key|Digit)/, "");
        return modifiers.flatMap((modifier) => [modifier, "+"]).concat(key);
    }

    function startRebinding(action: MediaShortcutAction) {
        rebinding = action;
        mediaShortcutRebindingStore.set(true);
    }

    function captureShortcut(event: KeyboardEvent, action: MediaShortcutAction) {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") {
            rebinding = undefined;
            mediaShortcutRebindingStore.set(false);
            return;
        }
        if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;
        const shortcut = {
            key: event.code,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
        };
        setMediaShortcut(action, shortcut);
        mediaShortcuts = { ...mediaShortcuts, [action]: shortcut };
        rebinding = undefined;
        mediaShortcutRebindingStore.set(false);
    }

    function handleWindowKeydown(event: KeyboardEvent) {
        if (rebinding) {
            captureShortcut(event, rebinding);
        }
    }

    onMount(() => {
        window.addEventListener("keydown", handleWindowKeydown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeydown);
            rebinding = undefined;
            mediaShortcutRebindingStore.set(false);
        };
    });

    onMount(() => {
        const userInputManager = gameManager.getCurrentGameScene().userInputManager;

        const shortcut1 = userInputManager.keysCodeList;
        const shortcut2 = userInputManager.userInputHandler.shortcuts;

        const rawShortcuts = shortcut1.concat(shortcut2);

        const newGroupedShortcuts: GroupedShortcut[] = [];

        rawShortcuts.forEach(({ description, key, ctrlKey, shiftKey, altKey }) => {
            let keys: string[] = [];

            if (ctrlKey || shiftKey || altKey) {
                if (ctrlKey) {
                    keys = ["Ctrl", "+"];
                }
                if (shiftKey) {
                    keys.push("Shift", "+");
                }
                if (altKey) {
                    keys.push("Alt", "+");
                }
            }
            keys.push(key);

            const existing = newGroupedShortcuts.find((item) => item.description === description);
            if (existing) {
                existing.keys = existing.keys.concat([",", ...keys]);
            } else {
                newGroupedShortcuts.push({ description, keys: keys });
            }
        });

        groupedShortcuts = newGroupedShortcuts;
    });
</script>

<div class="customize-main">
    <div class="submenu p-4">
        <h2 class="text-white text-lg font-semibold mb-4">{$LL.menu.shortcuts.title()}</h2>
        <table class="w-full table-auto rounded overflow-hidden border-none">
            <thead>
                <tr class="text-left uppercase text-gray-300 text-sm tracking-wider">
                    <th class="p-3 font-semibold">{$LL.menu.shortcuts.keys()}</th>
                    <th class="p-3 font-semibold">{$LL.menu.shortcuts.actions()}</th>
                </tr>
            </thead>
            <tbody>
                <tr class="border-t-4 border-white">
                    <td class="p-3">
                        <button
                            class="inline-flex items-center gap-1 p-0 bg-transparent border-0 font-mono"
                            title={$LL.menu.shortcuts.setShortcut()}
                            aria-label={$LL.menu.shortcuts.setShortcut()}
                            onclick={() => startRebinding("microphone")}
                        >
                            {#if rebinding === "microphone"}
                                {$LL.menu.shortcuts.pressKey()}
                            {:else}
                                {#each shortcutKeyParts(mediaShortcuts.microphone) as key, i (i)}
                                    {#if i % 2 === 0}
                                        <span
                                            class="bg-gray-700 text-white px-4 py-3 rounded text-sm font-mono shadow-sm border-2 border-solid border-black p-2 border-b-4 hover:border-b-2"
                                            >{key}</span
                                        >
                                    {:else}
                                        <span class="text-gray-400">{key}</span>
                                    {/if}
                                {/each}
                            {/if}
                        </button>
                    </td>
                    <td class="p-3 text-white">{$LL.menu.shortcuts.toggleMicrophone()}</td>
                </tr>
                <tr class="border-t-4 border-white">
                    <td class="p-3">
                        <button
                            class="inline-flex items-center gap-1 p-0 bg-transparent border-0 font-mono"
                            title={$LL.menu.shortcuts.setShortcut()}
                            aria-label={$LL.menu.shortcuts.setShortcut()}
                            onclick={() => startRebinding("camera")}
                        >
                            {#if rebinding === "camera"}
                                {$LL.menu.shortcuts.pressKey()}
                            {:else}
                                {#each shortcutKeyParts(mediaShortcuts.camera) as key, i (i)}
                                    {#if i % 2 === 0}
                                        <span
                                            class="bg-gray-700 text-white px-4 py-3 rounded text-sm font-mono shadow-sm border-2 border-solid border-black p-2 border-b-4 hover:border-b-2"
                                            >{key}</span
                                        >
                                    {:else}
                                        <span class="text-gray-400">{key}</span>
                                    {/if}
                                {/each}
                            {/if}
                        </button>
                    </td>
                    <td class="p-3 text-white">{$LL.menu.shortcuts.toggleCamera()}</td>
                </tr>
                {#each groupedShortcuts as shortcut, i (i)}
                    <tr class="hover:bg-white/5 border-t-4 border-white mx-3">
                        <td class="p-3">
                            {#each shortcut.keys as key, i (i)}
                                {#if i % 2 === 0}
                                    <span
                                        class="bg-gray-700 text-white px-4 py-3 rounded text-sm font-mono shadow-sm border-2 border-solid border-black p-2 border-b-4 hover:border-b-2"
                                    >
                                        {key}
                                    </span>
                                {:else}
                                    <span class="text-gray-400">
                                        {key}
                                    </span>
                                {/if}
                            {/each}
                        </td>
                        <td class="p-3 text-white">{shortcut.description}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
