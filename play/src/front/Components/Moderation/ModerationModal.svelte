<script lang="ts">
    import { onMount, type Snippet } from "svelte";
    import type { BanIpPreviewAnswer } from "@workadventure/messages";
    import Popup from "../Modal/Popup.svelte";
    import Button from "../UI/Button.svelte";
    import TextArea from "../Input/TextArea.svelte";
    import InputRadio from "../Input/InputRadio.svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { blackListManager } from "../../WebRtc/BlackListManager";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { userIsAdminStore } from "../../Stores/GameStore";
    import { hasCapability } from "../../Connection/Capabilities";
    import { mediaSynchronizedSpacesStore } from "../../Stores/PeerStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { meetingOf } from "../../Administration/CurrentMeeting";
    import { modals } from "@wa-modals";
    import {
        IconAlertTriangle,
        IconChevronLeft,
        IconDoorExit,
        IconForbid,
        IconForbid2,
        IconUserMinus,
    } from "@wa-icons";

    interface Props {
        isOpen: boolean;
        userUuid: string;
        userName: string;
    }

    let { isOpen, userUuid, userName }: Props = $props();

    /** Undefined on the list of actions, set once the moderator picked one. */
    type Step = "report" | "remove" | "kick" | "ban";
    let step: Step | undefined = $state(undefined);

    let userIsBlocked = $state(false);
    /** The one text field of the modal: the report message, or the reason of a kick / ban. */
    let text = $state("");
    let textIsEmpty = $state(false);

    const canReport = connectionManager.currentRoom?.canReport ?? false;

    /**
     * The conversations (bubble, meeting room, megaphone) the moderator shares with the user: removing them only
     * makes sense from there, and the private event that does it goes through those spaces.
     */
    const sharedSpaces = $derived(
        $mediaSynchronizedSpacesStore.filter((space) => space.getSpaceUserByUuid(userUuid) !== undefined),
    );

    /** A ban locks out the account only, unless the moderator also bans the IP it connected from. */
    let banScope: "account" | "ip" = $state("account");
    /** Who else a ban by IP would lock out. Undefined while loading. */
    let ipPreview = $state<BanIpPreviewAnswer | undefined>(undefined);
    let ipPreviewFailed = $state(false);
    const canBanIp = $derived(ipPreview !== undefined && ipPreview.ipKnown && !ipPreview.includesModerator);

    onMount(() => {
        userIsBlocked = blackListManager.isBlackListed(userUuid);
    });

    function pick(next: Step) {
        step = next;
        text = "";
        textIsEmpty = false;
        if (next === "ban") {
            banScope = "account";
            loadIpPreview();
        }
    }

    function loadIpPreview() {
        ipPreview = undefined;
        ipPreviewFailed = false;
        const connection = gameManager.getCurrentGameScene().connection;
        if (!connection) {
            ipPreviewFailed = true;
            return;
        }
        connection
            .queryBanIpPreview(userUuid)
            .then((preview) => {
                ipPreview = preview;
            })
            .catch((e) => {
                console.error("Could not check who shares the IP address of the user to ban", e);
                ipPreviewFailed = true;
            });
    }

    function toggleBlock() {
        if (userIsBlocked) {
            blackListManager.cancelBlackList(userUuid);
        } else {
            blackListManager.blackList(userUuid);
        }
        modals.close();
    }

    function removeFromConversation() {
        for (const space of sharedSpaces) {
            const spaceUser = space.getSpaceUserByUuid(userUuid);
            if (spaceUser === undefined) {
                continue;
            }
            analyticsClient.trackAdminEvent("meeting.participant.kicked", meetingOf(space));
            spaceUser.emitPrivateEvent({
                $case: "kickOffUser",
                kickOffUser: {},
            });
        }
    }

    function submit() {
        const connection = gameManager.getCurrentGameScene().connection;
        if (step === "remove") {
            removeFromConversation();
        } else if (step === "report") {
            if (text.trim() === "") {
                textIsEmpty = true;
                return;
            }
            connection?.emitReportPlayerMessage(
                userUuid,
                `
                -- Date: ${new Date().getTime()} -- \r
                -- Reporter: ${gameManager.getPlayerName()} -- \r
                -- Reported: ${userName} -- \n\r
                ${text}
            `,
            );
        } else {
            connection?.emitBanPlayerMessage(
                userUuid,
                userName,
                step === "kick",
                text.trim(),
                step === "ban" && banScope === "ip" && canBanIp,
            );
        }
        modals.close();
    }
</script>

{#snippet forbidIcon()}<IconForbid font-size="24" />{/snippet}
{#snippet alertIcon()}<IconAlertTriangle font-size="24" />{/snippet}
{#snippet removeIcon()}<IconUserMinus font-size="24" />{/snippet}
{#snippet doorIcon()}<IconDoorExit font-size="24" />{/snippet}
{#snippet banIcon()}<IconForbid2 font-size="24" />{/snippet}
{#snippet backIcon()}<IconChevronLeft font-size="20" />{/snippet}

{#snippet actionRow(label: string, hint: string, icon: Snippet, onclick: () => void, testId: string)}
    <button
        type="button"
        data-testid={testId}
        {onclick}
        class="flex flex-row items-center gap-3 w-full p-3 rounded-lg text-left bg-white/5 hover:bg-white/15 transition-colors"
    >
        <span class="flex items-center">{@render icon()}</span>
        <span class="flex flex-col">
            <span class="font-semibold">{label}</span>
            <span class="text-xs opacity-60">{hint}</span>
        </span>
    </button>
{/snippet}

<Popup {isOpen} withAction={step !== undefined}>
    {#snippet title()}
        <div class="flex flex-row items-center gap-2 pb-2">
            {#if step !== undefined}
                <Button
                    appearance="ghost"
                    square={true}
                    icon={backIcon}
                    dataTestId="moderation-back"
                    onclick={() => (step = undefined)}
                />
            {/if}
            <h2 class="mb-0">
                {#if step === "report"}
                    {$LL.report.title()}
                {:else if step === "remove"}
                    {$LL.report.moderate.remove.confirmTitle({ userName })}
                {:else if step === "kick"}
                    {$LL.report.moderate.kick.confirmTitle({ userName })}
                {:else if step === "ban"}
                    {$LL.report.moderate.ban.confirmTitle({ userName })}
                {:else}
                    {$LL.report.moderate.title({ userName })}
                {/if}
            </h2>
        </div>
    {/snippet}

    {#snippet content()}
        <div class="flex flex-col gap-4 w-full text-left">
            {#if step === undefined}
                {@render actionRow(
                    userIsBlocked ? $LL.report.block.unblock() : $LL.report.block.block(),
                    $LL.report.moderate.hint.block(),
                    forbidIcon,
                    toggleBlock,
                    "blockmenu-block-user-button",
                )}
                {#if canReport}
                    {@render actionRow(
                        $LL.report.title(),
                        $LL.report.moderate.hint.report(),
                        alertIcon,
                        () => pick("report"),
                        "moderation-report-action",
                    )}
                {/if}
                {#if $userIsAdminStore}
                    <div class="flex flex-row items-center gap-3 text-xs uppercase opacity-50">
                        <span class="h-px grow bg-white/20"></span>
                        {$LL.report.moderate.adminOnly()}
                        <span class="h-px grow bg-white/20"></span>
                    </div>
                    {#if sharedSpaces.length > 0}
                        {@render actionRow(
                            $LL.report.moderate.remove.title(),
                            $LL.report.moderate.hint.remove(),
                            removeIcon,
                            () => pick("remove"),
                            "moderation-remove-action",
                        )}
                    {/if}
                    {@render actionRow(
                        $LL.report.moderate.kick.title(),
                        $LL.report.moderate.hint.kick(),
                        doorIcon,
                        () => pick("kick"),
                        "moderation-kick-action",
                    )}
                    {#if hasCapability("api/ban")}
                        {@render actionRow(
                            $LL.report.moderate.ban.title(),
                            $LL.report.moderate.hint.ban(),
                            banIcon,
                            () => pick("ban"),
                            "moderation-ban-action",
                        )}
                    {/if}
                {/if}
            {:else}
                <p class="mb-0 opacity-70">
                    {#if step === "report"}
                        {$LL.report.content()}
                    {:else if step === "remove"}
                        {$LL.report.moderate.remove.content({ userName })}
                    {:else if step === "kick"}
                        {$LL.report.moderate.kick.content({ userName })}
                    {:else}
                        {$LL.report.moderate.ban.content({ userName })}
                    {/if}
                </p>
                {#if step === "ban"}
                    <fieldset class="flex flex-col" data-testid="moderation-ban-scope">
                        <InputRadio
                            label={$LL.report.moderate.ban.scope.account()}
                            value="account"
                            bind:group={banScope}
                            id="moderation-ban-scope-account"
                        />
                        <InputRadio
                            label={$LL.report.moderate.ban.scope.ip()}
                            value="ip"
                            bind:group={banScope}
                            disabled={!canBanIp}
                            id="moderation-ban-scope-ip"
                        />
                        <!-- On its own line, aligned with the text of the label: 8px padding + 20px radio + 8px gap + 12px label padding. -->
                        <p class="mb-0 -mt-2 pl-12 text-xs opacity-60" data-testid="moderation-ban-scope-ip-hint">
                            {#if ipPreviewFailed}
                                {$LL.report.moderate.ban.scope.error()}
                            {:else if ipPreview === undefined}
                                {$LL.report.moderate.ban.scope.loading()}
                            {:else if !ipPreview.ipKnown}
                                {$LL.report.moderate.ban.scope.ipUnknown()}
                            {:else if ipPreview.includesModerator}
                                {$LL.report.moderate.ban.scope.ipShared()}
                            {:else}
                                {$LL.report.moderate.ban.scope.ipHint()}
                            {/if}
                        </p>
                    </fieldset>
                    {#if banScope === "ip" && ipPreview !== undefined && canBanIp}
                        <div
                            class="flex flex-col gap-2 p-3 rounded-lg bg-white/5"
                            data-testid="moderation-ban-ip-preview"
                        >
                            {#if ipPreview.users.length === 0}
                                <p class="mb-0 text-sm">{$LL.report.moderate.ban.scope.nobody()}</p>
                            {:else}
                                <p class="mb-0 flex flex-row items-center gap-2 text-sm font-semibold">
                                    <IconAlertTriangle font-size="20" class="shrink-0" />
                                    {$LL.report.moderate.ban.scope.others({ count: ipPreview.users.length })}
                                </p>
                                <ul class="mb-0 flex flex-col gap-1 max-h-40 overflow-y-auto list-none p-0 pl-7">
                                    {#each ipPreview.users as user, index (index)}
                                        <li class="text-sm">{user.name}</li>
                                    {/each}
                                </ul>
                            {/if}
                        </div>
                    {/if}
                    <p class="mb-0 flex flex-row items-center gap-2 font-semibold">
                        <IconAlertTriangle font-size="20" class="shrink-0" />
                        {$LL.report.moderate.ban.confirmContent()}
                    </p>
                {/if}
                <!-- Removing someone from a conversation carries no message: the toast they get says it all. -->
                {#if step !== "remove"}
                    <TextArea
                        label={step === "report" ? $LL.report.message.title() : $LL.report.moderate.reason.label()}
                        placeHolder={step === "report" ? "" : $LL.report.moderate.reason.placeholder({ userName })}
                        bind:value={text}
                        optional={step !== "report"}
                        height="h-[80px]"
                        maxlength={500}
                        onkeypress={() => (textIsEmpty = false)}
                        dataTestId="moderation-text"
                    />
                {/if}
                {#if textIsEmpty}
                    <p class="mb-0 flex flex-row items-center gap-2 font-semibold" role="alert">
                        <IconAlertTriangle font-size="20" class="shrink-0" />
                        {$LL.report.message.empty()}
                    </p>
                {/if}
            {/if}
        </div>
    {/snippet}

    {#snippet action()}
        <Button class="flex-1" appearance="ghost" dataTestId="moderation-cancel" onclick={() => modals.close()}>
            {$LL.report.moderate.cancel()}
        </Button>
        <Button
            class="flex-1"
            variant={step === "ban" ? "danger" : "secondary"}
            dataTestId="moderation-submit"
            onclick={submit}
        >
            {#if step === "report"}
                {$LL.report.submit()}
            {:else if step === "remove"}
                {$LL.report.moderate.remove.submit()}
            {:else if step === "kick"}
                {$LL.report.moderate.kick.submit()}
            {:else if banScope === "ip" && canBanIp && (ipPreview?.users.length ?? 0) > 0}
                {$LL.report.moderate.ban.scope.submitWithOthers({ count: (ipPreview?.users.length ?? 0) + 1 })}
            {:else}
                {$LL.report.moderate.ban.submit()}
            {/if}
        </Button>
    {/snippet}
</Popup>
