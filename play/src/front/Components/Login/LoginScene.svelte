<script lang="ts">
    import type { Game } from "../../Phaser/Game/Game";
    import type { LoginScene } from "../../Phaser/Login/LoginScene";
    import { LoginSceneName } from "../../Phaser/Login/LoginScene";
    import { MAX_USERNAME_LENGTH } from "../../Enum/EnvironmentVariable";
    import logoImg from "../images/logo.png";
    import poweredByWorkAdventureImg from "../images/Powered_By_WorkAdventure_Big.png";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL, { locale } from "../../../i18n/i18n-svelte";
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
            const formatter = new Intl.ListFormat(locale as unknown as string, { style: "long", type: "conjunction" });
            legalString = formatter.format(legalStrings);
        } else {
            // For old browsers
            legalString = legalStrings.join(", ");
        }
    }

    function submit() {
        startValidating = true;

        let finalName = name.trim();
        if (finalName !== "") {
            try {
                loginScene.login(finalName);
            } catch (err) {
                if (err instanceof NameTooLongError) {
                    errorName = $LL.login.input.name.tooLongError();
                } else if (err instanceof NameNotValidError) {
                    errorName = $LL.login.input.name.notValidError();
                } else {
                    throw err;
                }
            }
        }
    }

    function getBackgroundColor() {
        if (!gameManager.currentStartedRoom) return undefined;
        return gameManager.currentStartedRoom.backgroundColor;
    }
</script>

<form
    class="loginScene w-screen flex flex-col h-screen px-10 md:px-32 pointer-events-auto pt-20"
    style={getBackgroundColor() != undefined ? `background-color: ${getBackgroundColor()};` : ""}
    on:submit|preventDefault={submit}
>
    <section class="h-fit max-w-2xl self-center">
        <img src={logo} alt="logo" class="main-logo w-full" />
    </section>
    <div class="w-full sm:w-96 md:w-10/12 lg:w-1/2 xl:w-1/3 rounded mx-auto text-center p-8">
        <section class="text-center flex h-fit flex-col justify-center items-center">
            <h2 class="text-white text-2xl">{$LL.login.input.name.placeholder()}</h2>
            <!-- svelte-ignore a11y-autofocus -->
            <input
                type="text"
                name="loginSceneName"
                class="w-52 md:w-96 text-center border-white"
                autofocus
                maxlength={MAX_USERNAME_LENGTH}
                bind:value={name}
                on:keypress={() => {
                    startValidating = true;
                }}
                class:is-error={(name.trim() === "" && startValidating) || errorName !== ""}
            />
            {#if (name.trim() === "" && startValidating) || errorName !== ""}
                <p class="err text-pop-red text-sm">
                    {#if errorName}{errorName}{:else}{$LL.login.input.name.empty()}{/if}
                </p>
            {/if}
        </section>

        <!-- svelte-ignore a11y-autofocus -->

        {#if legalString}
            <section class="terms-and-conditions flex h-fit">
                <a style="display: none;" href="traduction">Need for traduction</a>
                <p class="text-white">
                    {@html $LL.login.terms({
                        links: legalString,
                    })}
                </p>
            </section>
        {/if}
        <section class="action flex h-fit justify-center">
            <button type="submit" class="light loginSceneFormSubmit">{$LL.login.continue()}</button>
        </section>
    </div>
    {#if logo !== logoImg && gameManager.currentStartedRoom.showPoweredBy !== false}
        <section class="text-right flex powered-by justify-center items-end">
            <img src={poweredByWorkAdventureImg} alt="Powered by WorkAdventure" class="h-14" />
        </section>
    {/if}
</form>
