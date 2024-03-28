<script lang="ts">
    import { onDestroy } from "svelte";
    import { IconChevronDown, IconChevronUp } from "@tabler/icons-svelte";
    import { InfoIcon } from "svelte-feather-icons";
    import { PersonalAreaAccessClaimMode, PersonalAreaPropertyData } from "@workadventure/map-editor";
    import LL from "../../../i18n/i18n-svelte";
    import InputTags from "../Input/InputTags.svelte";
    import {
        PersonalAreaPropertyEditorRules,
        Option,
    } from "../../Rules/PersonalAreaPropertyEditorRules/PersonalAreaPropertyEditorRules";

    const personalAreaPropertyEditorRules = new PersonalAreaPropertyEditorRules();

    let personalAreaPropertyData: PersonalAreaPropertyData | undefined = undefined;
    let areaOwner = "";
    let existingTags: Option[] = [];

    const personalAreaPropertyDataUnSubscriber =
        personalAreaPropertyEditorRules.getPersonalAreaPropertyDataUnSubscriber((currentPersonalAreaPropertyData) => {
            personalAreaPropertyData = currentPersonalAreaPropertyData;
            if (currentPersonalAreaPropertyData) {
                areaOwner = currentPersonalAreaPropertyData.owner;
                existingTags = personalAreaPropertyEditorRules.mapExistingAllowedTagsToTagOption(
                    currentPersonalAreaPropertyData.allowedTags
                );
            }
        });

    let isPersonalAreaPropertyEditorExpanded = false;

    function expandCollapsePersonalAreaPropertyEditor() {
        isPersonalAreaPropertyEditorExpanded = !isPersonalAreaPropertyEditorExpanded;
    }

    onDestroy(() => {
        personalAreaPropertyDataUnSubscriber();
    });
</script>

{#if personalAreaPropertyData !== undefined}
    <div class="tw-overflow-y-auto tw-overflow-x-hidden tw-flex tw-flex-col tw-gap-2">
        {#if !isPersonalAreaPropertyEditorExpanded}
            <button
                class="tw-pl-0 tw-text-blue-500"
                data-testid="expandPersonalAreaProperty"
                on:click={expandCollapsePersonalAreaPropertyEditor}
            >
                <IconChevronDown />
                {$LL.mapEditor.areaEditor.personalAreaConfiguration.title()}
            </button>
        {:else}
            <button class="tw-pl-0 tw-text-blue-500" on:click={expandCollapsePersonalAreaPropertyEditor}>
                <IconChevronUp />
                {$LL.mapEditor.areaEditor.personalAreaConfiguration.title()}
            </button>
            <p class="help-text">
                <InfoIcon size="18" />
                {$LL.mapEditor.areaEditor.personalAreaConfiguration.description()}
            </p>
            <div class="tw-self-center">
                <input
                    id="isPersonalArea"
                    data-testid="isPersonalArea"
                    type="checkbox"
                    bind:checked={personalAreaPropertyData.isPersonalArea}
                    on:click={(event) => personalAreaPropertyEditorRules.setIsPersonalArea(event.currentTarget.checked)}
                />
                <label for="isPersonalArea"
                    >{$LL.mapEditor.areaEditor.personalAreaConfiguration.setAsPersonalArea()}</label
                >
            </div>
            {#if personalAreaPropertyData.isPersonalArea}
                {#if personalAreaPropertyData.owner.trim().length !== 0}
                    <div class="tw-flex tw-flex-col">
                        <label for="ownerInput">{$LL.mapEditor.areaEditor.personalAreaConfiguration.owner()}</label>
                        <input
                            id="ownerInput"
                            bind:value={areaOwner}
                            disabled
                            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
                        />
                        <button
                            class="tw-self-center tw-text-red-500"
                            data-testid="revokeAccessButton"
                            on:click={() => personalAreaPropertyEditorRules.removeOwner()}
                        >
                            {$LL.mapEditor.areaEditor.personalAreaConfiguration.revokeAccess()}
                        </button>
                    </div>
                {:else}
                    <div>
                        <p class="tw-p-0">
                            {$LL.mapEditor.areaEditor.personalAreaConfiguration.accessClaimMode()}
                        </p>
                        <select
                            data-testid="accessClaimMode"
                            bind:value={personalAreaPropertyData.accessClaimMode}
                            on:change={(event) =>
                                personalAreaPropertyEditorRules.setAccessClaimMode(
                                    PersonalAreaAccessClaimMode.parse(event.currentTarget.value)
                                )}
                            class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
                        >
                            {#each PersonalAreaAccessClaimMode.options as claimMode (claimMode)}
                                <option value={claimMode}
                                    >{$LL.mapEditor.areaEditor.personalAreaConfiguration[
                                        `${claimMode}AccessClaimMode`
                                    ]()}</option
                                >
                            {/each}
                        </select>
                        <p class="help-text">
                            <InfoIcon size="18" />
                            {$LL.mapEditor.areaEditor.personalAreaConfiguration[
                                `${personalAreaPropertyData.accessClaimMode}AccessDescription`
                            ]()}
                        </p>
                    </div>
                    <div>
                        {#if personalAreaPropertyData.accessClaimMode === PersonalAreaAccessClaimMode.enum.static}
                            <label for="allowedUserInput"
                                >{$LL.mapEditor.areaEditor.personalAreaConfiguration.allowedUser()}</label
                            >
                            <input
                                id="allowedUserInput"
                                data-testid="allowedUserInput"
                                on:change={({ currentTarget }) =>
                                    personalAreaPropertyEditorRules.setOwner(currentTarget.value)}
                                bind:value={areaOwner}
                                class="tw-p-1 tw-rounded-md tw-bg-dark-purple !tw-border-solid !tw-border !tw-border-gray-400 tw-text-white tw-min-w-full"
                                placeholder={$LL.mapEditor.areaEditor.personalAreaConfiguration.allowedUser()}
                            />
                        {:else}
                            <InputTags
                                label={$LL.mapEditor.areaEditor.personalAreaConfiguration.allowedTags()}
                                options={personalAreaPropertyEditorRules.defaultAllowedTags}
                                bind:value={existingTags}
                                handleChange={() => personalAreaPropertyEditorRules.setAllowedTags(existingTags)}
                                testId="allowedTags"
                            />
                        {/if}
                    </div>
                {/if}
            {/if}
        {/if}
    </div>
{/if}
