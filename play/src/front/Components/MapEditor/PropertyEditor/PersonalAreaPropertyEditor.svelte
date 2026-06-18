<script lang="ts">
    import { onMount } from "svelte";
    import type { PersonalAreaPropertyData } from "@workadventure/map-editor";
    import { PersonalAreaAccessClaimMode } from "@workadventure/map-editor";
    import Select from "../../Input/Select.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import InputRoomTags from "../../Input/InputRoomTags.svelte";
    import MemberAutocomplete from "../../Input/MemberAutocomplete.svelte";
    import type { InputTagOption } from "../../Input/InputTagOption";
    import { toTags } from "../../Input/InputTagOption";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { mapEditorSelectedAreaPreviewStore } from "../../../Stores/MapEditorStore";
    import ActionPopupOnPersonalAreaWithEntities from "../ActionPopupOnPersonalAreaWithEntities.svelte";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import { IconInfoCircle, IconUser, IconDesk } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        property: PersonalAreaPropertyData;
        onchange?: (removeAreaEntities?: boolean) => void;
        onclose?: (removeAreaEntities?: boolean) => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();

    let _tags: InputTagOption[] | undefined = $state(
        property.allowedTags
            ? property.allowedTags.map((allowedTag) => ({
                  value: allowedTag,
                  created: false,
                  label: allowedTag,
              }))
            : undefined,
    );

    let personalAreaOwner: string | null = $state(property.ownerId);

    const entitiesManager = gameManager.getCurrentGameScene().getGameMapFrontWrapper().getEntitiesManager();

    onMount(async () => {
        if (property.ownerId) {
            const connection = gameManager.getCurrentGameScene().connection;
            if (connection) {
                const member = await connection.queryMember(property.ownerId);
                personalAreaOwner = member.name
                    ? `${member.name} ${member.email ? `(${member.email})` : ""}`
                    : member.email
                      ? member.email
                      : member.id;
            }
        }
    });

    function setOwnerId(selectedOwner: { value: string; label: string }) {
        property.ownerId = selectedOwner.value;
        personalAreaOwner = selectedOwner.label;
        onchange?.();
    }

    function handleTagChange(tags: InputTagOption[] | undefined) {
        if (tags) {
            property.allowedTags = toTags(tags);
        } else {
            property.allowedTags = [];
        }
        onchange?.();
    }

    function revokeOwner() {
        if (isPersonalAreaContainsEntities()) {
            openModalForActionOnAreaEntities("change", resetAreaOwner);
        } else {
            resetAreaOwner();
            onchange?.();
        }
    }

    function onRemoveProperty() {
        if (personalAreaOwner !== null && isPersonalAreaContainsEntities()) {
            openModalForActionOnAreaEntities("close");
        } else {
            onclose?.();
        }
    }

    function onClaimModeChange() {
        onchange?.();
    }

    function resetAreaOwner() {
        property.ownerId = null;
        personalAreaOwner = null;
    }

    function openModalForActionOnAreaEntities(dispatchType: "change" | "close", callback?: () => void) {
        modals.open(ActionPopupOnPersonalAreaWithEntities, {
            onDeleteEntities: () => {
                if (callback) {
                    callback();
                }
                if (dispatchType === "close") {
                    onclose?.(true);
                } else {
                    onchange?.(true);
                }
                modals.close();
            },
            onKeepEntities: () => {
                if (callback) {
                    callback();
                }
                if (dispatchType === "close") {
                    onclose?.();
                } else {
                    onchange?.();
                }
                modals.close();
            },
            onCancel: () => {
                modals.close();
            },
        });
    }

    function isPersonalAreaContainsEntities() {
        const areaId = $mapEditorSelectedAreaPreviewStore?.getId();
        if (areaId) {
            return entitiesManager.getEntitiesInsideArea(areaId).size > 0;
        }
        return false;
    }
</script>

<PropertyEditorBase onclose={onRemoveProperty}>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconDesk class="w-6 mr-1" />
            {$LL.mapEditor.properties.personalAreaPropertyData.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            {#if property !== undefined}
                <div class="overflow-y-auto overflow-x-hidden flex flex-col gap-2">
                    <p class="help-text">
                        <IconInfoCircle font-size="18" />
                        {$LL.mapEditor.properties.personalAreaPropertyData.description()}
                    </p>
                    {#if personalAreaOwner}
                        <div class="flex flex-col">
                            <div class="flex flex-col gap-2 bg-black/10 rounded-md p-2">
                                <div class="flex items-center justify-center gap-2 p-2">
                                    <IconUser />
                                    <span>{$LL.mapEditor.properties.personalAreaPropertyData.owner()}</span>
                                </div>
                                <div class="bg-white p-2 rounded flex flex-row items-center justify-between">
                                    <div class="m-0 text-black flex items-center gap-2">
                                        {personalAreaOwner}
                                    </div>
                                    <ButtonClose
                                        size="sm"
                                        textColor="text-black"
                                        bgColor="bg-black/10"
                                        hoverColor="hover:bg-black/20"
                                        onclick={revokeOwner}
                                    />
                                </div>
                            </div>
                            <button
                                class="flex items-center justify-center text-white p-2 bg-red-500/80 hover:bg-red-500 rounded mt-2"
                                data-testid="revokeAccessButton"
                                onclick={revokeOwner}
                            >
                                {$LL.mapEditor.properties.personalAreaPropertyData.revokeAccess()}
                            </button>
                        </div>
                    {:else}
                        <div>
                            <Select
                                id="accessClaimMode"
                                dataTestId="accessClaimMode"
                                label={$LL.mapEditor.properties.personalAreaPropertyData.accessClaimMode()}
                                bind:value={property.accessClaimMode}
                                onchange={onClaimModeChange}
                            >
                                {#each PersonalAreaAccessClaimMode.options as claimMode (claimMode)}
                                    <option value={claimMode}>
                                        {$LL.mapEditor.properties.personalAreaPropertyData[
                                            `${claimMode}AccessClaimMode`
                                        ]()}
                                    </option>
                                {/each}
                                {#snippet helper()}
                                    <div>
                                        <p class="help-text">
                                            <IconInfoCircle font-size="18" />
                                            {$LL.mapEditor.properties.personalAreaPropertyData[
                                                `${property.accessClaimMode}AccessDescription`
                                            ]()}
                                        </p>
                                    </div>
                                {/snippet}
                            </Select>
                        </div>
                        <div>
                            {#if property.accessClaimMode === PersonalAreaAccessClaimMode.enum.static}
                                <label for="allowedUserInput" class="input-label">
                                    {$LL.mapEditor.properties.personalAreaPropertyData.allowedUser()}
                                </label>
                                <MemberAutocomplete
                                    value={property.ownerId}
                                    placeholder={$LL.mapEditor.properties.personalAreaPropertyData.allowedUser()}
                                    select={(selectedUserId) => setOwnerId(selectedUserId)}
                                />
                            {:else}
                                <InputRoomTags
                                    label={$LL.mapEditor.properties.personalAreaPropertyData.allowedTags()}
                                    bind:value={_tags}
                                    onchange={() => handleTagChange(_tags)}
                                    testId="allowedTags"
                                />
                            {/if}
                        </div>
                    {/if}
                </div>
            {/if}
        </span>
    {/snippet}
</PropertyEditorBase>
