<script lang="ts">
    import { onMount, type Snippet } from "svelte";
    import Popup from "../Modal/Popup.svelte";
    import Button from "../UI/Button.svelte";
    import TextArea from "../Input/TextArea.svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { blackListManager } from "../../WebRtc/BlackListManager";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { userIsAdminStore } from "../../Stores/GameStore";
    import { modals } from "@wa-modals";
    import { IconAlertTriangle, IconChevronLeft, IconDoorExit, IconForbid, IconForbid2 } from "@wa-icons";

    interface Props {
        isOpen: boolean;
        userUuid: string;
        userName: string;
    }

    let { isOpen, userUuid, userName }: Props = $props();

    /** Undefined on the list of actions, set once the moderator picked one. */
    type Step = "report" | "kick" | "ban";
    let step: Step | undefined = $state(undefined);

    let userIsBlocked = $state(false);
    /** The one text field of the modal: the report message, or the reason of a kick / ban. */
    let text = $state("");
    let textIsEmpty = $state(false);

    const canReport = connectionManager.currentRoom?.canReport ?? false;

    onMount(() => {
        userIsBlocked = blackListManager.isBlackListed(userUuid);
    });

    function pick(next: Step) {
        step = next;
        text = "";
        textIsEmpty = false;
    }

    function toggleBlock() {
        if (userIsBlocked) {
            blackListManager.cancelBlackList(userUuid);
        } else {
            blackListManager.blackList(userUuid);
        }
        modals.close();
    }

    function submit() {
        const connection = gameManager.getCurrentGameScene().connection;
        if (step === "report") {
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
            connection?.emitBanPlayerMessage(userUuid, userName, step === "kick", text.trim());
        }
        modals.close();
    }
</script>

{#snippet forbidIcon()}<IconForbid font-size="24" />{/snippet}
{#snippet alertIcon()}<IconAlertTriangle font-size="24" />{/snippet}
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
                    {@render actionRow(
                        $LL.report.moderate.kick.title(),
                        $LL.report.moderate.hint.kick(),
                        doorIcon,
                        () => pick("kick"),
                        "moderation-kick-action",
                    )}
                    {@render actionRow(
                        $LL.report.moderate.ban.title(),
                        $LL.report.moderate.hint.ban(),
                        banIcon,
                        () => pick("ban"),
                        "moderation-ban-action",
                    )}
                {/if}
            {:else}
                <p class="mb-0 opacity-70">
                    {#if step === "report"}
                        {$LL.report.content()}
                    {:else if step === "kick"}
                        {$LL.report.moderate.kick.content({ userName })}
                    {:else}
                        {$LL.report.moderate.ban.content({ userName })}
                    {/if}
                </p>
                {#if step === "ban"}
                    <p class="mb-0 flex flex-row items-center gap-2 font-semibold">
                        <IconAlertTriangle font-size="20" class="shrink-0" />
                        {$LL.report.moderate.ban.confirmContent()}
                    </p>
                {/if}
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
            {:else if step === "kick"}
                {$LL.report.moderate.kick.submit()}
            {:else}
                {$LL.report.moderate.ban.submit()}
            {/if}
        </Button>
    {/snippet}
</Popup>
