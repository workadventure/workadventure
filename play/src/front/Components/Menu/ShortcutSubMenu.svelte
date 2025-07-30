<script lang="ts">
    import { shortcutStore } from "../../Stores/ShortcutStore";

    const shortcuts = shortcutStore.getShortcuts();
</script>

<div class="customize-main">
    <div class="submenu p-4">
        <h2 class="text-white text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
        <table class="w-full table-auto rounded overflow-hidden">
            <thead>
                <tr class="text-left uppercase text-gray-300 text-sm tracking-wider">
                    <th class="p-3 font-semibold">Keys</th>
                    <th class="p-3 font-semibold">Action</th>
                </tr>
            </thead>
            <tbody>
                {#each shortcuts as shortcut (shortcut.key)}
                    <tr class="hover:bg-white/5 border-t-4 border-white">
                        <td class="p-3 font-mono text-white">{shortcut.key}</td>
                        <td class="p-3 text-white">{shortcut.description}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
