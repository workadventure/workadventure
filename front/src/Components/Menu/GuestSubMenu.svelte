<script lang="ts">
    import LL from "../../i18n/i18n-svelte";
    import { startLayerNamesStore } from "../../Stores/StartLayerNamesStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import {
        walkAutomaticallyStore,
        copyLink,
        updateInputFieldValue,
        canShare,
        shareLink,
    } from "../../Stores/GuestMenuStore";

    let entryPoint: string = $startLayerNamesStore[0];
</script>

<div class="guest-main">
    <section class="container-overflow">
        {#if !canShare}
            <section class="share-url not-mobile">
                <h3>{$LL.menu.invite.description()}</h3>
                <input
                    type="text"
                    readonly
                    id="input-share-link"
                    class="link-url nes-input is-dark"
                    value={location.toString()}
                />
                <button
                    type="button"
                    class="nes-btn is-primary"
                    on:click={() => analyticsClient.inviteCopyLink()}
                    on:click={copyLink}>{$LL.menu.invite.copy()}</button
                >
            </section>
        {:else}
            <section class="is-mobile">
                <h3>{$LL.menu.invite.description()}</h3>
                <input type="hidden" readonly id="input-share-link" value={location.toString()} />
                <button
                    type="button"
                    class="nes-btn is-primary"
                    on:click={() => analyticsClient.inviteCopyLink()}
                    on:click={shareLink}>{$LL.menu.invite.share()}</button
                >
            </section>
        {/if}
        <h3>{$LL.menu.invite.selectEntryPoint()}</h3>
        <section class="nes-select is-dark starting-points">
            <select
                bind:value={entryPoint}
                on:blur={() => {
                    updateInputFieldValue();
                }}
            >
                {#each $startLayerNamesStore as entryPointName}
                    <option value={entryPointName}>{entryPointName}</option>
                {/each}
            </select>
        </section>
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={$walkAutomaticallyStore}
                on:change={(e) => analyticsClient.inviteCopyLinkWalk(e.currentTarget.value)}
                on:change={() => {
                    updateInputFieldValue();
                }}
            />
            <span>{$LL.menu.invite.walkAutomaticallyToPosition()}</span>
        </label>
    </section>
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    div.guest-main {
        width: 50%;
        margin-left: auto;
        margin-right: auto;
        height: calc(100% - 56px);

        input.link-url {
            width: calc(100% - 200px);
        }

        .starting-points {
            width: 80%;
        }

        section {
            margin-bottom: 50px;
        }

        section.nes-select select:focus {
            outline: none;
        }

        section.container-overflow {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: auto;
        }

        section.is-mobile {
            display: block;
            text-align: center;
            margin-bottom: 20px;
        }
    }

    @include media-breakpoint-up(md) {
        div.guest-main {
            section.container-overflow {
                height: calc(100% - 120px);
            }
        }
    }

    @include media-breakpoint-up(lg) {
        div.guest-main {
            width: 100%;
        }
    }
</style>
