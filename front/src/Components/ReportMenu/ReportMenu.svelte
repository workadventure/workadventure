<script lang="ts">
    import {showReportScreenStore} from "../../Stores/ShowReportScreenStore";
    import BlockSubMenu from "./BlockSubMenu.svelte";
    import ReportSubMenu from "./ReportSubMenu.svelte";
    import {onDestroy, onMount} from "svelte";
    import type {Unsubscriber} from "svelte/store";
    import {playersStore} from "../../Stores/PlayersStore";
    import {connectionManager} from "../../Connexion/ConnectionManager";
    import {GameConnexionTypes} from "../../Url/UrlManager";

    let blockActive =  true;
    let reportActive = !blockActive;
    let anonymous: boolean;
    let userUUID: string | undefined = '';
    let userName = "No name";
    let unsubscriber: Unsubscriber

    onMount(() => {
        unsubscriber = showReportScreenStore.subscribe((reportSreenStore) => {
            if (reportSreenStore != null) {
                userName = reportSreenStore.userName;
                userUUID = playersStore.getPlayerById(reportSreenStore.userId)?.userUuid;
                if (userUUID === undefined) {
                    throw new Error("Could not find UUID for user with ID " + reportSreenStore.userId);
                }
            }
        })
        anonymous = connectionManager.getConnexionType === GameConnexionTypes.anonymous;
    })

    onDestroy(() => {
        if (unsubscriber) {
            unsubscriber();
        }
    })

    function close() {
        showReportScreenStore.set(null);
    }

    function activateBlock() {
        blockActive = true;
        reportActive = false;
    }

    function activateReport() {
        blockActive = false;
        reportActive = true;
    }

</script>

<div class="report-menu-main nes-container is-rounded">
    <section class="report-menu-title">
        <h2>Moderate {userName}</h2>
        <section class="justify-center">
            <button type="button" class="nes-btn" on:click|preventDefault={close}>X</button>
        </section>
    </section>
    <section class="report-menu-action {anonymous ? 'hidden' : ''}">
        <section class="justify-center">
            <button type="button" class="nes-btn {blockActive ? 'is-disabled' : ''}" on:click|preventDefault={activateBlock}>Block</button>
        </section>
        <section class="justify-center">
            <button type="button" class="nes-btn {reportActive ? 'is-disabled' : ''}" on:click|preventDefault={activateReport}>Report</button>
        </section>
    </section>
    <section class="report-menu-content">
        {#if blockActive}
            <BlockSubMenu userUUID="{userUUID}"/>
        {:else if reportActive}
            <ReportSubMenu userUUID="{userUUID}"/>
        {:else }
            <p>ERROR : There is no action selected.</p>
        {/if}
    </section>
</div>

<style lang="scss">
  .nes-container {
    padding: 5px;
  }

  section.justify-center {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  div.report-menu-main {
    font-family: "Press Start 2P";
    pointer-events: auto;
    background-color: #333333;
    color: whitesmoke;

    position: relative;
    height: 70vh;
    width: 50vw;
    top: clamp(55px, 10vh, 10vh);
    margin: auto;

    section.report-menu-title {
      display: grid;
      grid-template-columns: calc(100% - 45px) 40px;
      margin-bottom: 20px;

      h2 {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    section.report-menu-action {
      display: grid;
      grid-template-columns: 50% 50%;
      margin-bottom: 20px;
    }

    section.report-menu-action.hidden {
      display: none;
    }
  }

  @media only screen and (max-height: 900px) {
    div.report-menu-main {
      bottom: 55px;
      width: 100vw;
      font-size: 0.5em;
    }
  }
</style>