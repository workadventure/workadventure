<script lang="ts">
    import { onMount } from "svelte";
    import { get, readable } from "svelte/store";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { getColorHexOfStatus, getStatusLabel } from "../../../Utils/AvailabilityStatus";
    import type { ChatConversation, ChatUser } from "../../Connection/ChatConnection";
    import { hasChatRoomMembershipManagement, hasProximityChatSidePanel } from "../../Connection/ChatConnection";
    import type { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
    import LL from "../../../../i18n/i18n-svelte";
    import {
        countOnlineMembers,
        formatBubbleSubtitle,
        formatDirectSubtitle,
        formatRoomSubtitle,
    } from "./conversationSubtitle";

    interface Props {
        room: ChatConversation;
        centered?: boolean;
    }

    let { room, centered = true }: Props = $props();

    let merger = $state<UserProviderMerger | undefined>(undefined);

    onMount(() => {
        gameManager
            .getCurrentGameScene()
            .userProviderMerger.then((resolved) => (merger = resolved))
            .catch((error) => console.error(error));
    });

    $effect(() => {
        if (hasChatRoomMembershipManagement(room)) {
            room.ensureMembersInitialized().catch((error) => console.error(error));
        }
    });

    const emptyUsersByRoom: UserProviderMerger["usersByRoomStore"] = readable(new Map());
    let usersByRoomStore = $derived(merger?.usersByRoomStore ?? emptyUsersByRoom);
    /** Every known user by chat id; users that are not connected sit under the `undefined` play URI. */
    let usersByChatId = $derived(
        new Map(
            [...$usersByRoomStore.values()]
                .flatMap(({ users }) => users)
                .filter((user): user is ChatUser & { chatId: string } => !!user.chatId)
                .map((user) => [user.chatId, user]),
        ),
    );

    let membershipRoom = $derived(hasChatRoomMembershipManagement(room) ? room : undefined);
    let membersStore = $derived(membershipRoom?.members ?? readable([]));
    let joinedMemberIds = $derived(
        $membersStore.filter((member) => get(member.membership) === "join").map((member) => member.id),
    );
    let joinedMemberCountStore = $derived(membershipRoom?.joinedMemberCount);
    let roomTypeStore = $derived(room.type);

    let peer = $derived(
        $roomTypeStore === "direct"
            ? usersByChatId.get(joinedMemberIds.find((id) => id !== localUserStore.getChatId()) ?? "")
            : undefined,
    );
    let peerIsConnected = $derived(peer?.playUri !== undefined);
    let peerStatusStore = $derived(peerIsConnected ? peer?.availabilityStatus : undefined);
    let peerStatus = $derived($peerStatusStore ?? AvailabilityStatus.ONLINE);

    let bubble = $derived(hasProximityChatSidePanel(room) ? room : undefined);
    let participantsStore = $derived(bubble?.currentMeetingParticipantsStore ?? readable([]));

    let subtitle = $derived.by(() => {
        if (bubble) {
            return formatBubbleSubtitle($LL, $participantsStore, localUserStore.getLocalUser()?.uuid);
        }
        if (!membershipRoom) {
            return undefined;
        }
        if ($roomTypeStore === "direct") {
            if (joinedMemberIds.length === 0) {
                return undefined;
            }
            return peerIsConnected && peer
                ? formatDirectSubtitle(getStatusLabel(peerStatus), peer.roomName)
                : $LL.actionbar.status.OFFLINE();
        }
        const onlineIds = new Set(
            [...usersByChatId.values()].filter((user) => user.playUri !== undefined).map((user) => user.chatId),
        );
        return formatRoomSubtitle(
            $LL,
            $joinedMemberCountStore ?? joinedMemberIds.length,
            countOnlineMembers(joinedMemberIds, onlineIds),
        );
    });
</script>

{#if subtitle}
    <div
        class="text-xs font-normal opacity-75 truncate flex items-center gap-1 {centered ? 'justify-center' : ''}"
        data-testid="roomSubtitle"
    >
        {#if peer && peerIsConnected && $roomTypeStore === "direct"}
            <span class="h-2 w-2 rounded-full shrink-0" style="background-color: {getColorHexOfStatus(peerStatus)}"
            ></span>
        {/if}
        <span class="truncate">{subtitle}</span>
    </div>
{/if}
