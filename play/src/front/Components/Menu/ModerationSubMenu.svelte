<script lang="ts">
    import { onMount } from "svelte";
    import { SvelteSet } from "svelte/reactivity";
    import type { BannedUser } from "@workadventure/messages";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Button from "../UI/Button.svelte";
    import { IconRefresh } from "@wa-icons";

    let bannedUsers: BannedUser[] = $state([]);
    let loading = $state(true);
    let failed = $state(false);
    /** Ids of the bans being lifted right now, so the button cannot be clicked twice. */
    const lifting = new SvelteSet<string>();

    async function load() {
        loading = true;
        failed = false;
        try {
            bannedUsers = (await gameManager.getCurrentGameScene().connection?.queryBannedUsers()) ?? [];
        } catch (e) {
            console.error("Could not load the banned users", e);
            failed = true;
        } finally {
            loading = false;
        }
    }

    async function unban(ban: BannedUser) {
        lifting.add(ban.id);
        try {
            await gameManager.getCurrentGameScene().connection?.queryUnbanUser(ban.id);
            bannedUsers = bannedUsers.filter((other) => other.id !== ban.id);
        } catch (e) {
            console.error("Could not lift the ban", e);
            failed = true;
        } finally {
            lifting.delete(ban.id);
        }
    }

    function formatDate(iso: string): string {
        const date = new Date(iso);
        return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
    }

    onMount(() => {
        load().catch((e) => console.error(e));
    });
</script>

{#snippet refreshIcon()}<IconRefresh />{/snippet}

<div class="customize-main">
    <div class="submenu p-4">
        <div class="flex flex-row items-center justify-between gap-4 mb-4">
            <div>
                <h2 class="text-white text-lg font-semibold mb-1">{$LL.menu.moderation.title()}</h2>
                <p class="mb-0 text-sm opacity-70">{$LL.menu.moderation.description()}</p>
            </div>
            <Button
                appearance="border"
                size="sm"
                icon={refreshIcon}
                disabled={loading}
                dataTestId="moderation-refresh"
                onclick={() => load().catch((e) => console.error(e))}
            >
                {$LL.menu.moderation.refresh()}
            </Button>
        </div>

        {#if failed}
            <p class="text-pop-red">{$LL.menu.moderation.error()}</p>
        {/if}

        {#if loading}
            <p class="opacity-70">{$LL.menu.moderation.loading()}</p>
        {:else if bannedUsers.length === 0}
            <p class="opacity-70" data-testid="moderation-empty">{$LL.menu.moderation.empty()}</p>
        {:else}
            <table class="w-full table-auto rounded overflow-hidden border-none" data-testid="moderation-banned-list">
                <thead>
                    <tr class="text-left uppercase text-gray-300 text-sm tracking-wider">
                        <th class="p-3 font-semibold">{$LL.menu.moderation.name()}</th>
                        <th class="p-3 font-semibold">{$LL.menu.moderation.reason()}</th>
                        <th class="p-3 font-semibold">{$LL.menu.moderation.bannedAt()}</th>
                        <th class="p-3 font-semibold">{$LL.menu.moderation.bannedBy()}</th>
                        <th class="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {#each bannedUsers as ban (ban.id)}
                        <tr class="hover:bg-white/5 border-t-4 border-white">
                            <td class="p-3 text-white">
                                {ban.name || ban.uuid || $LL.menu.moderation.unknownUser()}
                            </td>
                            <td class="p-3 text-white opacity-80">{ban.reason}</td>
                            <td class="p-3 text-white opacity-80 whitespace-nowrap">{formatDate(ban.bannedAt)}</td>
                            <td class="p-3 text-white opacity-80">{ban.bannedBy}</td>
                            <td class="p-3 text-right">
                                <Button
                                    variant="danger"
                                    size="sm"
                                    disabled={lifting.has(ban.id)}
                                    dataTestId="moderation-unban-{ban.id}"
                                    onclick={() => unban(ban).catch((e) => console.error(e))}
                                >
                                    {$LL.menu.moderation.unban()}
                                </Button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>
