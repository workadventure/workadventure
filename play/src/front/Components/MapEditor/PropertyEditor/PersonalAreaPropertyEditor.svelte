<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { InfoIcon } from "svelte-feather-icons";
    import { PersonalAreaAccessClaimMode, PersonalAreaPropertyData } from "@workadventure/map-editor";
    // eslint-disable-next-line import/no-unresolved
    import { closeModal, openModal } from "svelte-modals";
    import LL from "../../../../i18n/i18n-svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import MemberAutocomplete from "../../Input/MemberAutocomplete.svelte";
    import { InputTagOption, toTags } from "../../Input/InputTagOption";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { mapEditorSelectedAreaPreviewStore } from "../../../Stores/MapEditorStore";
    import ActionPopupOnPersonalAreaWithEntities from "../ActionPopupOnPersonalAreaWithEntities.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let personalAreaPropertyData: PersonalAreaPropertyData;

    let _tags: InputTagOption[] | undefined = personalAreaPropertyData.allowedTags
        ? personalAreaPropertyData.allowedTags.map((allowedTag) => ({
              value: allowedTag,
              created: false,
              label: allowedTag,
          }))
        : undefined;

    let personalAreaOwner: string | null = personalAreaPropertyData.ownerId;

    const dispatch = createEventDispatcher();
    const entitiesManager = gameManager.getCurrentGameScene().getGameMapFrontWrapper().getEntitiesManager();

    onMount(async () => {
        if (personalAreaPropertyData.ownerId) {
            const connection = gameManager.getCurrentGameScene().connection;
            if (connection) {
                const member = await connection.queryMember(personalAreaPropertyData.ownerId);
                personalAreaOwner = member.name
                    ? `${member.name} ${member.email ? `(${member.email})` : ""}`
                    : member.email
                    ? member.email
                    : member.id;
            }
        }
    });

    function setOwnerId(selectedOwner: { value: string; label: string }) {
        personalAreaPropertyData.ownerId = selectedOwner.value;
        personalAreaOwner = selectedOwner.label;
        dispatch("change");
    }

    function handleTagChange(tags: InputTagOption[] | undefined) {
        if (tags) {
            personalAreaPropertyData.allowedTags = toTags(tags);
        } else {
            personalAreaPropertyData.allowedTags = [];
        }
        dispatch("change");
    }

    function revokeOwner() {
        if (isPersonalAreaContainsEntities()) {
            openModalForActionOnAreaEntities("change", resetAreaOwner);
        } else {
            resetAreaOwner();
            dispatch("change");
        }
    }

    function onRemoveProperty() {
        if (personalAreaOwner !== null && isPersonalAreaContainsEntities()) {
            openModalForActionOnAreaEntities("close");
        } else {
            dispatch("close");
        }
    }

    function onClaimModeChange() {
        dispatch("change");
    }

    function resetAreaOwner() {
        personalAreaPropertyData.ownerId = null;
        personalAreaOwner = null;
    }

    function openModalForActionOnAreaEntities(dispatchType: "change" | "close", callback?: () => void) {
        openModal(ActionPopupOnPersonalAreaWithEntities, {
            onDeleteEntities: () => {
                if (callback) {
                    callback();
                }
                dispatch(dispatchType, true);
                closeModal();
            },
            onKeepEntities: () => {
                if (callback) {
                    callback();
                }
                dispatch(dispatchType);
                closeModal();
            },
            onCancel: () => {
                closeModal();
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

<PropertyEditorBase on:close={onRemoveProperty}>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        {$LL.mapEditor.properties.personalAreaConfiguration.label()}
    </span>
    <span slot="content">
        {#if personalAreaPropertyData !== undefined}
            <div class="tw-overflow-y-auto tw-overflow-x-hidden tw-flex tw-flex-col tw-gap-2">
                <p class="help-text">
                    <InfoIcon size="18" />
                    {$LL.mapEditor.properties.personalAreaConfiguration.description()}
                </p>
                {#if personalAreaOwner}
                    <div class="tw-flex tw-flex-col">
                        <label for="ownerInput">{$LL.mapEditor.properties.personalAreaConfiguration.owner()}</label>
                        <p class="tw-m-0 tw-text-blue-500">
                            {personalAreaOwner}
                        </p>
                        <button
                            class="tw-self-center tw-text-red-500"
                            data-testid="revokeAccessButton"
                            on:click={revokeOwner}
                        >
                            {$LL.mapEditor.properties.personalAreaConfiguration.revokeAccess()}
                        </button>
                    </div>
                {:else}
                    <div>
                        <p class="tw-p-0">
                            {$LL.mapEditor.properties.personalAreaConfiguration.accessClaimMode()}
                        </p>
                        <select
                            data-testid="accessClaimMode"
                            bind:value={personalAreaPropertyData.accessClaimMode}
                            on:change={onClaimModeChange}
                            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
                        >
                            {#each PersonalAreaAccessClaimMode.options as claimMode (claimMode)}
                                <option value={claimMode}
                                    >{$LL.mapEditor.properties.personalAreaConfiguration[
                                        `${claimMode}AccessClaimMode`
                                    ]()}</option
                                >
                            {/each}
                        </select>
                        <p class="help-text">
                            <InfoIcon size="18" />
                            {$LL.mapEditor.properties.personalAreaConfiguration[
                                `${personalAreaPropertyData.accessClaimMode}AccessDescription`
                            ]()}
                        </p>
                    </div>
                    <div>
                        {#if personalAreaPropertyData.accessClaimMode === PersonalAreaAccessClaimMode.enum.static}
                            <label for="allowedUserInput"
                                >{$LL.mapEditor.properties.personalAreaConfiguration.allowedUser()}</label
                            >
                            <MemberAutocomplete
                                value={personalAreaPropertyData.ownerId}
                                placeholder={$LL.mapEditor.properties.personalAreaConfiguration.allowedUser()}
                                on:onSelect={({ detail: selectedUserId }) => setOwnerId(selectedUserId)}
                            />
                        {:else}
                            <InputTags
                                label={$LL.mapEditor.properties.personalAreaConfiguration.allowedTags()}
                                bind:value={_tags}
                                handleChange={() => handleTagChange(_tags)}
                                testId="allowedTags"
                            />
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </span>
</PropertyEditorBase>
