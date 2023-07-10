<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { OpenWebsitePropertyData } from "@workadventure/map-editor";
    import { AlertTriangleIcon } from "svelte-feather-icons";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: OpenWebsitePropertyData;
    export let triggerOnActionChoosen: boolean = property.trigger === "onaction";
    export let isArea = false;
    let optionAdvancedActivated = false;
    let embeddable = true;
    let embeddableLoading = false;
    let error = "";
    let oldNewTabValue = property.newTab;
    let linkElement: HTMLInputElement;

    const dispatch = createEventDispatcher();

    onMount(() => {
        checkEmbeddableWebsite();
    });

    function onTriggerValueChange() {
        triggerOnActionChoosen = property.trigger === "onaction";
        dispatch("change");
    }

    function onNewTabValueChange() {
        if (property.newTab) {
            if (property.trigger === "onicon") {
                property.trigger = undefined;
            }
        }
        dispatch("change");
    }

    function onValueChange() {
        dispatch("change");
    }

    function checkEmbeddableWebsite() {
        embeddableLoading = true;
        error = "";

        if (!linkElement.checkValidity()) {
            embeddableLoading = false;
            error = $LL.mapEditor.properties.linkProperties.errorInvalidUrl();
            return;
        }

        gameManager
            .getCurrentGameScene()
            .connection?.queryEmbeddableWebsite(property.link)
            .then((answer) => {
                if (answer) {
                    if (answer.message) {
                        error = answer.message;
                    }
                    if (!answer.state) {
                        throw new Error(answer.message);
                    }
                    embeddable = answer.embeddable;
                    property.newTab = oldNewTabValue;
                    if (answer.embeddable) {
                        if (!oldNewTabValue) {
                            optionAdvancedActivated = false;
                        }
                    } else {
                        optionAdvancedActivated = true;
                        property.newTab = true;
                        embeddable = false;
                    }
                }
            })
            .catch((e: unknown) => {
                embeddable = true;
                if (e instanceof Error) {
                    error = e.message;
                } else {
                    error = $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                }
                console.info("Error checking embeddable website", e);
            })
            .finally(() => {
                embeddableLoading = false;
                onValueChange();
            });
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img
            class="tw-w-6 tw-mr-1"
            src="resources/icons/icon_link.png"
            alt={$LL.mapEditor.properties.linkProperties.description()}
        />
        {$LL.mapEditor.properties.linkProperties.label()}
    </span>
    <span slot="content">
        {#if isArea}
            <div>
                <label class="tw-m-0" for="trigger">{$LL.mapEditor.properties.linkProperties.trigger()}</label>
                <select
                    id="trigger"
                    class="tw-w-full tw-m-0"
                    bind:value={property.trigger}
                    on:change={onTriggerValueChange}
                >
                    <option value={undefined}>{$LL.mapEditor.properties.linkProperties.triggerShowImmediately()}</option
                    >
                    {#if !property.newTab}
                        <option value="onicon">{$LL.mapEditor.properties.linkProperties.triggerOnClick()}</option>
                    {/if}
                    <option value="onaction">{$LL.mapEditor.properties.linkProperties.triggerOnAction()}</option>
                </select>
            </div>
        {/if}
        <div class="value-input tw-flex tw-flex-col">
            <label for="tabLink">{$LL.mapEditor.properties.linkProperties.linkLabel()}</label>
            <input
                id="tabLink"
                type="url"
                bind:this={linkElement}
                placeholder={$LL.mapEditor.properties.linkProperties.linkPlaceholder()}
                bind:value={property.link}
                on:change={onValueChange}
                on:blur={checkEmbeddableWebsite}
                disabled={embeddableLoading}
            />
            {#if error}
                <span class="err tw-text-pop-red tw-text-xs tw-italic tw-mt-1">{error}</span>
            {/if}
            {#if !embeddable && !error}
                <span class="err tw-text-orange tw-text-xs tw-italic tw-mt-1"
                    ><AlertTriangleIcon size="12" />
                    {$LL.mapEditor.properties.linkProperties.messageNotEmbeddableLink()}.
                    <a
                        href="https://workadventu.re/map-building/troubleshooting.md#content-issues-embedding-a-website"
                        target="_blank">{$LL.mapEditor.properties.linkProperties.findOutMoreHere()}</a
                    >.</span
                >
            {/if}
        </div>
        {#if !property.hideButtonLabel}
            <div class="value-input tw-flex tw-flex-col">
                <label for="linkButton">{$LL.mapEditor.entityEditor.buttonLabel()}</label>
                <input id="linkButton" type="text" bind:value={property.buttonLabel} on:change={onValueChange} />
            </div>
        {/if}
        <div class="value-switch">
            <label for="advancedOption">{$LL.mapEditor.properties.advancedOptions()}</label>
            <input id="advancedOption" type="checkbox" class="input-switch" bind:checked={optionAdvancedActivated} />
        </div>
        <div class:active={optionAdvancedActivated} class="advanced-option tw-px-2">
            {#if triggerOnActionChoosen}
                <div class="value-input tw-flex tw-flex-col">
                    <label for="triggerMessage">{$LL.mapEditor.properties.linkProperties.triggerMessage()}</label>
                    <input
                        id="triggerMessage"
                        type="text"
                        bind:value={property.triggerMessage}
                        on:change={onValueChange}
                    />
                </div>
            {/if}
            <div class="value-switch">
                <label for="newTab">{$LL.mapEditor.properties.linkProperties.newTabLabel()}</label>
                <input
                    id="newTab"
                    type="checkbox"
                    class="input-switch"
                    bind:checked={property.newTab}
                    on:change={onNewTabValueChange}
                />
            </div>
            {#if !embeddable && !property.newTab}
                <div class="tw-mb-3">
                    <span class="err tw-text-orange tw-text-xs tw-italic"
                        ><AlertTriangleIcon size="12" />
                        {$LL.mapEditor.properties.linkProperties.warningEmbeddableLink()}.
                        <a
                            href="https://workadventu.re/map-building/troubleshooting.md#content-issues-embedding-a-website"
                            target="_blank">{$LL.mapEditor.properties.linkProperties.findOutMoreHere()}</a
                        >.</span
                    >
                </div>
            {/if}
            {#if !property.newTab}
                <div class="">
                    <label for="websiteWidth"
                        >{$LL.mapEditor.properties.linkProperties.width()}: {property.width ?? 50}%</label
                    >
                    <input
                        id="websiteWidth"
                        type="range"
                        min="0"
                        max="100"
                        placeholder="50"
                        bind:value={property.width}
                        on:change={onValueChange}
                    />
                </div>
            {/if}
            <div class="value-switch">
                <label for="closable">{$LL.mapEditor.properties.linkProperties.closable()}</label>
                <input
                    id="closable"
                    type="checkbox"
                    class="input-switch"
                    bind:checked={property.closable}
                    on:change={onValueChange}
                />
            </div>
            <div class="value-switch">
                <label for="allowAPI">{$LL.mapEditor.properties.linkProperties.allowAPI()}</label>
                <input
                    id="allowAPI"
                    type="checkbox"
                    class="input-switch"
                    bind:checked={property.allowAPI}
                    on:change={onValueChange}
                />
            </div>
            <div class="value-input tw-flex tw-flex-col">
                <label for="policy">{$LL.mapEditor.properties.linkProperties.policy()}</label>
                <input
                    id="policy"
                    type="text"
                    placeholder={$LL.mapEditor.properties.linkProperties.policyPlaceholder()}
                    bind:value={property.policy}
                    on:change={onValueChange}
                />
            </div>
        </div>
    </span>
</PropertyEditorBase>

<style lang="scss">
    .value-input {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
    .advanced-option {
        display: none;
        &.active {
            display: block;
        }
    }
</style>
