<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { InfoIcon } from "svelte-feather-icons";
    import { PersonalAreaAccessClaimMode, PersonalAreaPropertyData } from "@workadventure/map-editor";
    import LL from "../../../../i18n/i18n-svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import MemberAutocomplete from "../../Input/MemberAutocomplete.svelte";
    import { InputTagOption, toTags } from "../../Input/InputTagOption";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let personalAreaPropertyData: PersonalAreaPropertyData;

    let areaOwnerIdInput: string | undefined = personalAreaPropertyData.ownerId;
    let _tags: InputTagOption[] | undefined = personalAreaPropertyData.allowedTags
        ? personalAreaPropertyData.allowedTags.map((allowedTag) => ({
              value: allowedTag,
              created: false,
              label: allowedTag,
          }))
        : undefined;

    const dispatch = createEventDispatcher();

    function setOwnerId(selectedOwnerId: string) {
        personalAreaPropertyData.ownerId = selectedOwnerId;
        areaOwnerIdInput = selectedOwnerId;
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
        personalAreaPropertyData.ownerId = "";
        areaOwnerIdInput = "";
        dispatch("change");
    }

    function onClaimModeChange() {
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
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
                {#if personalAreaPropertyData.ownerId?.trim().length !== 0}
                    <div class="tw-flex tw-flex-col">
                        <label for="ownerInput">{$LL.mapEditor.properties.personalAreaConfiguration.owner()}</label>
                        <input
                            id="ownerInput"
                            value={areaOwnerIdInput}
                            disabled
                            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
                        />
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
                                value={areaOwnerIdInput}
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
