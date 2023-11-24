<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import type { LoginScene } from "../../Phaser/Login/LoginScene";
    import { LoginSceneName } from "../../Phaser/Login/LoginScene";
    import { MAX_USERNAME_LENGTH } from "../../Enum/EnvironmentVariable";
    import logoImg from "../images/logo.png";
    import poweredByWorkAdventureImg from "../images/Powered_By_WorkAdventure_Big.png";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import { NameNotValidError, NameTooLongError } from "../../Exception/NameError";

    export let game: Game;

    const loginScene = game.scene.getScene(LoginSceneName) as LoginScene;

    let name = gameManager.getPlayerName() || "";
    let startValidating = false;
    let errorName = "";

    let logo = gameManager.currentStartedRoom?.loginSceneLogo ?? logoImg;
    let legals = gameManager.currentStartedRoom?.legals ?? {};

    let legalStrings: string[] = [];
    if (legals?.termsOfUseUrl) {
        legalStrings.push(
            '<a href="' + encodeURI(legals.termsOfUseUrl) + '" target="_blank">' + $LL.login.termsOfUse() + "</a>"
        );
    }
    if (legals?.privacyPolicyUrl) {
        legalStrings.push(
            '<a href="' + encodeURI(legals.privacyPolicyUrl) + '" target="_blank">' + $LL.login.privacyPolicy() + "</a>"
        );
    }
    if (legals?.cookiePolicyUrl) {
        legalStrings.push(
            '<a href="' + encodeURI(legals.cookiePolicyUrl) + '" target="_blank">' + $LL.login.cookiePolicy() + "</a>"
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

<form
    class="loginScene tw-w-screen tw-flex tw-flex-col tw-h-screen tw-px-10 md:tw-px-32 tw-pointer-events-auto tw-pt-20"
    style={getBackgroundColor() != undefined ? `background-color: ${getBackgroundColor()};` : ""}
    on:submit|preventDefault={submit}
>
    <section class="tw-h-fit tw-max-w-2xl tw-self-center">
        <img src={logo} alt="logo" class="main-logo tw-w-full" />
    </section>
    <div class="tw-w-full sm:tw-w-96 md:tw-w-10/12 lg:tw-w-1/2 xl:tw-w-1/3 tw-rounded tw-mx-auto tw-text-center tw-p-8">
        <section class="text-center tw-flex tw-h-fit tw-flex-col tw-justify-center tw-items-center">
            <h2 class="tw-text-white tw-text-2xl">{$LL.login.input.name.placeholder()}</h2>
            <!-- svelte-ignore a11y-autofocus -->
            <input
                type="text"
                name="loginSceneName"
                class="tw-w-52 md:tw-w-96 tw-text-center tw-border-white"
                autofocus
                maxlength={MAX_USERNAME_LENGTH}
                bind:value={name}
                on:keypress={() => {
                    startValidating = true;
                }}
                class:is-error={(name.trim() === "" && startValidating) || errorName !== ""}
            />
            {#if (name.trim() === "" && startValidating) || errorName !== ""}
                <p class="err tw-text-pop-red tw-text-sm">
                    {#if errorName}{errorName}{:else}{$LL.login.input.name.empty()}{/if}
                </p>
            {/if}
        </section>

        {#if legalString}
            <section class="terms-and-conditions tw-flex tw-h-fit">
                <a style="display: none;" href="traduction">Need for traduction</a>
                <p class="tw-text-white">
                    {@html $LL.login.terms({
                        links: legalString,
                    })}
                </p>
            </section>
        {/if}
        <section class="action tw-flex tw-h-fit tw-justify-center">
            <button type="submit" class="light loginSceneFormSubmit">{$LL.login.continue()}</button>
        </section>
    </div>
    {#if logo !== logoImg && gameManager.currentStartedRoom.showPoweredBy !== false}
        <section class="text-right tw-flex powered-by tw-justify-center tw-items-end">
            <img src={poweredByWorkAdventureImg} alt="Powered by WorkAdventure" class="tw-h-14" />
        </section>
    {/if}
</form>
