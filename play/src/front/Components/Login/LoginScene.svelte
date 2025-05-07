<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import type { LoginScene } from "../../Phaser/Login/LoginScene";
    import { LoginSceneName } from "../../Phaser/Login/LoginScene";
    import { MAX_USERNAME_LENGTH } from "../../Enum/EnvironmentVariable";
    import logoImg from "../images/logo.svg";
    import poweredByWorkAdventureImg from "../images/Powered_By_WorkAdventure_Big.png";
    import bgMap from "../images/map-exemple.png";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import { NameNotValidError, NameTooLongError } from "../../Exception/NameError";

    export let game: Game;

    const loginScene = game.scene.getScene(LoginSceneName) as LoginScene;

    let name = gameManager.getPlayerName() || "";
    let startValidating = false;
    let errorName = "";

    let logo = gameManager.currentStartedRoom.loginSceneLogo ?? logoImg;
    let legals = gameManager.currentStartedRoom?.legals ?? {};

    const sceneBg = gameManager.currentStartedRoom.backgroundSceneImage ?? bgMap;

    let legalStrings: string[] = [];
    if (legals?.termsOfUseUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.termsOfUseUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.termsOfUse() +
                "</a>"
        );
    }
    if (legals?.privacyPolicyUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.privacyPolicyUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.privacyPolicy() +
                "</a>"
        );
    }
    if (legals?.cookiePolicyUrl) {
        legalStrings.push(
            '<a href="' +
                encodeURI(legals.cookiePolicyUrl) +
                '" target="_blank" class="text-white no-underline hover:underline bold hover:text-white">' +
                $LL.login.cookiePolicy() +
                "</a>"
        );
    }

    let legalString: string | undefined;
    if (legalStrings.length > 0) {
        if (Intl.ListFormat) {
            const formatter = new Intl.ListFormat($locale, { style: "long", type: "conjunction" });
            legalString = formatter.format(legalStrings);
        } else {
            // For old browsers
            legalString = legalStrings.join(", ");
        }
    }

    async function submit() {
        startValidating = true;

        let finalName = name.trim();
        if (finalName !== "") {
            try {
                await loginScene.login(finalName);
            } catch (err) {
                if (err instanceof NameTooLongError) {
                    errorName = $LL.login.input.name.tooLongError();
                } else if (err instanceof NameNotValidError) {
                    errorName = $LL.login.input.name.notValidError();
                } else {
                    errorName = $LL.login.genericError();
                    throw err;
                }
            }
        }
    }

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }

    /* eslint-disable svelte/no-at-html-tags */
</script>

<section class="self-center absolute z-30 top-0 text-center w-full block">
    <img
        src={logo}
        alt="logo"
        class="main-logo mt-8 {gameManager.currentStartedRoom.loginSceneLogo ? 'max-h-[200px] object-cover' : ''}"
        style="width: 333px;"
    />
</section>

<form
    class="loginScene h-dvh flex flex-col items-center justify-center pointer-events-auto relative z-30"
    on:submit|preventDefault={submit}
>
    <div class="w-full sm:w-96 md:w-10/12 lg:w-1/2 xl:w-1/3 rounded mx-auto text-center p-8">
        <section class="text-center flex h-fit flex-col justify-center items-center mb-0">
            <span class="text-white text-lg bold">
                {$LL.login.input.name.placeholder()}
            </span>
            <!-- svelte-ignore a11y-autofocus -->
            <input
                type="text"
                name="loginSceneName"
                placeholder={$LL.login.input.name.placeholder()}
                class="w-52 md:w-96 h-12 text text-center bg-contrast rounded border border-solid border-white/20 mt-4 mb-0"
                autofocus
                maxlength={MAX_USERNAME_LENGTH}
                bind:value={name}
                on:keypress={() => {
                    startValidating = true;
                }}
                class:border-danger={(name.trim() === "" && startValidating) || errorName !== ""}
            />
            {#if (name.trim() === "" && startValidating) || errorName !== ""}
                <p class="err text-xs text-danger italic pt-2 mb-0">
                    {#if errorName}{errorName}{:else}{$LL.login.input.name.empty()}{/if}
                </p>
            {/if}
        </section>
        <section
            class="action flex h-fit justify-center m-0"
            class:opacity-50={(name.trim() === "" && startValidating) || errorName !== ""}
        >
            <button
                type="submit"
                disabled={(name.trim() === "" && startValidating) || errorName !== ""}
                class="mt-4 w-52 md:w-96 bold text-center block btn btn-secondary btn-lg loginSceneFormSubmit"
                >{$LL.login.continue()}</button
            >
        </section>
        {#if legalString}
            <section class="terms-and-conditions h-fit text-center w-full">
                <p class="text-white text-xs italic opacity-50">
                    {@html $LL.login.terms({
                        links: legalString,
                    })}
                </p>
            </section>
        {/if}
    </div>
    {#if logo !== logoImg && gameManager.currentStartedRoom.showPoweredBy !== false}
        <section class="text-right flex powered-by justify-center items-end">
            <img src={poweredByWorkAdventureImg} alt="Powered by WorkAdventure" class="h-14" />
        </section>
    {/if}
</form>
<div
    class="absolute left-0 top-0 w-full h-full z-20 bg-contrast opacity-80"
    style={getBackgroundColor() != undefined ? `background-color: ${getBackgroundColor()};` : ""}
/>
<div class="absolute left-0 top-0 w-full h-full bg-cover z-10" style="background-image: url('{sceneBg}');" />
