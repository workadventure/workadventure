<script lang="ts">
    import { LinkTag, MetaTags } from "svelte-meta-tags";
    import type { Game } from "../Phaser/Game/Game";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import { errorStore } from "../Stores/ErrorStore";
    import { errorScreenStore } from "../Stores/ErrorScreenStore";
    import { loginSceneVisibleStore } from "../Stores/LoginSceneStore";
    import { enableCameraSceneVisibilityStore } from "../Stores/MediaStore";
    import { selectCharacterSceneVisibleStore } from "../Stores/SelectCharacterStore";
    import { selectCompanionSceneVisibleStore } from "../Stores/SelectCompanionStore";
    import Chat from "./Chat/Chat.svelte";
    import EnableCameraScene from "./EnableCamera/EnableCameraScene.svelte";
    import LoginScene from "./Login/LoginScene.svelte";
    import MainLayout from "./MainLayout.svelte";
    import SelectCharacterScene from "./selectCharacter/SelectCharacterScene.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import ErrorDialog from "./UI/ErrorDialog.svelte";
    import ErrorScreen from "./UI/ErrorScreen.svelte";
    import { gameSceneIsLoadedStore } from "../Stores/GameSceneStore";
    import { gameManager } from "../Phaser/Game/GameManager";

    export let game: Game;

    const startedRoom = gameManager?.currentStartedRoom;

    const organization = startedRoom?.organization ?? "";
    console.log(
        "the test",
        startedRoom?.showPoweredBy === undefined || startedRoom?.showPoweredBy === true ? "WorkAdventure" : ""
    );
    let windowTitle = startedRoom?.name ? `${startedRoom.name} | ${organization}` : organization;
    windowTitle +=
        windowTitle && (startedRoom?.showPoweredBy === undefined || startedRoom?.showPoweredBy) === true ? " | " : "";
    windowTitle +=
        startedRoom?.showPoweredBy === undefined || startedRoom?.showPoweredBy === true ? "WorkAdventure" : "";
    const windowDescription = startedRoom?.description ?? "Work, Meet & Learn. Your workplace. Better.";
    const favicons = startedRoom?.favicons ?? [];
    const ogImageUrl = startedRoom?.ogImageUrl ?? "https://workadventu.re/images/general/logo-og.png";

    const additionalLinkTags: LinkTag[] = [];

    favicons.forEach((favicon) => {
        additionalLinkTags.push({
            rel: favicon.rel,
            href: favicon.href,
            sizes: favicon.sizes,
        });
    });
</script>

<MetaTags
    title={windowTitle}
    description={windowDescription}
    openGraph={{
        url: window.location.href,
        title: windowTitle,
        type: "website",
        description: windowDescription,
        images: [
            {
                url: ogImageUrl,
                alt: windowTitle,
            },
        ],
    }}
    twitter={{
        cardType: "summary_large_image",
        title: windowTitle,
        description: windowDescription,
        image: ogImageUrl,
        imageAlt: windowTitle,
    }}
    additionalLinkTags={[...additionalLinkTags]}
/>

{#if $errorScreenStore !== undefined}
    <div>
        <ErrorScreen />
    </div>
{:else if $errorStore.length > 0}
    <div>
        <ErrorDialog />
    </div>
{:else if $loginSceneVisibleStore}
    <div class="scrollable">
        <LoginScene {game} />
    </div>
{:else if $selectCharacterSceneVisibleStore}
    <div>
        <SelectCharacterScene {game} />
    </div>
{:else if $selectCompanionSceneVisibleStore}
    <div>
        <SelectCompanionScene {game} />
    </div>
{:else if $enableCameraSceneVisibilityStore}
    <div class="scrollable">
        <EnableCameraScene {game} />
    </div>
{:else if $gameSceneIsLoadedStore}
    <MainLayout />

    {#if $chatVisibilityStore}
        <Chat />
    {/if}
{/if}
