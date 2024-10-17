<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import PropertyEditorBase from "../../../front/Components/MapEditor/PropertyEditor/PropertyEditorBase.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { TeamsAreaMapEditorData, TeamsMeetingPropertyData } from "../MapEditor/types";
    import TeamsLogoSvg from "./images/business.svg";

    export let property: TeamsMeetingPropertyData;
    export let extensionModuleAreaMapEditor: TeamsAreaMapEditorData;

    const dispatch = createEventDispatcher();
    let optionAdvancedActivated = false;
    let temasOnlineMeetingId: string;

    async function onValueChange() {
        console.log("property.data", property.data);

        if (!property.data) {
            property.data = {
                msTeamsMeeting: undefined,
                temasOnlineMeetingId: undefined,
            };
        }

        if (temasOnlineMeetingId && temasOnlineMeetingId.length > 0) {
            temasOnlineMeetingId = temasOnlineMeetingId?.trim().replace(new RegExp(" ", "g"), "");
            property.data.temasOnlineMeetingId = temasOnlineMeetingId;
            await getOnLineMeetingUrl();
        } else {
            property.data.msTeamsMeeting = null;
        }
        dispatch("change", property.data);
    }

    function toggleAdvancedOption() {
        optionAdvancedActivated = !optionAdvancedActivated;
    }

    async function getOnLineMeetingUrl() {
        if (!extensionModuleAreaMapEditor.teams.getOnlineMeetingByJoinMeetingId || !temasOnlineMeetingId) return;
        try {
            const msTeamsMeeting = await extensionModuleAreaMapEditor.teams.getOnlineMeetingByJoinMeetingId(
                temasOnlineMeetingId
            );
            if (msTeamsMeeting) {
                property.data!.msTeamsMeeting = msTeamsMeeting;
            } else {
                property.data!.msTeamsMeeting = null;
            }
        } catch (e) {
            console.error("Error getting online meeting", e);
            property.data!.msTeamsMeeting = null;
        }
    }

    onMount(() => {
        if (!property.data) {
            property.data = {
                msTeamsMeeting: undefined,
                temasOnlineMeetingId: undefined,
            };
        }

        if (property.data.msTeamsMeeting?.joinMeetingIdSettings.joinMeetingId) {
            temasOnlineMeetingId = property.data.msTeamsMeeting.joinMeetingIdSettings.joinMeetingId;
            optionAdvancedActivated = true;
        }

        dispatch("change", property.data);
    });
</script>

<PropertyEditorBase on:close={() => dispatch("close")}>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img class="tw-w-6 tw-mr-1" src={TeamsLogoSvg} alt="Teams logo" />
        Microsoft Teams
    </span>
    <span slot="content">
        <p>Entering in this area, a user will enter in Microsoft team meeting automatically.</p>
        <div class="value-switch">
            <label for="advancedOption">{$LL.mapEditor.properties.advancedOptions()}</label>
            <input id="advancedOption" type="checkbox" class="input-switch" on:change={toggleAdvancedOption} />
        </div>
        {#if optionAdvancedActivated}
            <div class="advanced-option tw-px-2">
                <div class="value-input tw-flex tw-flex-col">
                    <label for="teamsMeetingId">Teams meeting id</label>
                    <input
                        id="teamsMeetingId"
                        type="text"
                        placeholder="Teams meeting id"
                        bind:value={temasOnlineMeetingId}
                        on:change={onValueChange}
                    />
                </div>
            </div>
        {/if}

        {#if property.data && property.data.msTeamsMeeting}
            <div class="tw-flex tw-flex-col tw-mt-2">
                <span class="tw-text-sm">Meeting subject: {property.data.msTeamsMeeting.subject}</span>
                <span class="tw-text-sm tw-whitespace-nowrap"
                    >Meeting ID: {property.data.msTeamsMeeting.joinMeetingIdSettings.joinMeetingId}</span
                >
            </div>
        {:else if temasOnlineMeetingId}
            <div class="tw-flex tw-flex-col tw-items-center tw-mt-2">
                <span class="tw-text-sm tw-text-warning-800">⚠️ Meeting not found</span>
            </div>
        {/if}
    </span>
</PropertyEditorBase>
