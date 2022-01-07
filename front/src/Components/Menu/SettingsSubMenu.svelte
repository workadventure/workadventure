<script lang="typescript">
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import { videoConstraintStore } from "../../Stores/MediaStore";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import { isMobile } from "../../Enum/EnvironmentVariable";
    import { menuVisiblilityStore } from "../../Stores/MenuStore";
    import { languages, translator } from "../../Translator/Translator";

    let fullscreen: boolean = localUserStore.getFullscreen();
    let notification: boolean = localUserStore.getNotification() === "granted";
    let forceCowebsiteTrigger: boolean = localUserStore.getForceCowebsiteTrigger();
    let ignoreFollowRequests: boolean = localUserStore.getIgnoreFollowRequests();
    let valueGame: number = localUserStore.getGameQualityValue();
    let valueVideo: number = localUserStore.getVideoQualityValue();
    let valueLanguage: string = translator.getStringByLanguage(translator.getCurrentLanguage()) ?? "en-US";
    let previewValueGame = valueGame;
    let previewValueVideo = valueVideo;
    let previewValueLanguage = valueLanguage;

    function saveSetting() {
        let change = false;

        if (valueLanguage !== previewValueLanguage) {
            previewValueLanguage = valueLanguage;
            translator.switchLanguage(previewValueLanguage);
            change = true;
        }

        if (valueVideo !== previewValueVideo) {
            previewValueVideo = valueVideo;
            videoConstraintStore.setFrameRate(valueVideo);
        }

        if (valueGame !== previewValueGame) {
            previewValueGame = valueGame;
            localUserStore.setGameQualityValue(valueGame);
            change = true;
        }

        if (change) {
            window.location.reload();
        }

        closeMenu();
    }

    function changeFullscreen() {
        const body = HtmlUtils.querySelectorOrFail("body");
        if (body) {
            if (document.fullscreenElement !== null && !fullscreen) {
                document.exitFullscreen().catch((e) => console.error(e));
            } else {
                body.requestFullscreen().catch((e) => console.error(e));
            }
            localUserStore.setFullscreen(fullscreen);
        }
    }

    function changeNotification() {
        if (Notification.permission === "granted") {
            localUserStore.setNotification(notification ? "granted" : "denied");
        } else {
            Notification.requestPermission()
                .then((response) => {
                    if (response === "granted") {
                        localUserStore.setNotification(notification ? "granted" : "denied");
                    } else {
                        localUserStore.setNotification("denied");
                        notification = false;
                    }
                })
                .catch((e) => console.error(e));
        }
    }

    function changeForceCowebsiteTrigger() {
        localUserStore.setForceCowebsiteTrigger(forceCowebsiteTrigger);
    }

    function changeIgnoreFollowRequests() {
        localUserStore.setIgnoreFollowRequests(ignoreFollowRequests);
    }

    function closeMenu() {
        menuVisiblilityStore.set(false);
    }
</script>

<div class="settings-main" on:submit|preventDefault={saveSetting}>
    <section>
        <h3>{translator._("menu.settings.game-quality.title")}</h3>
        <div class="nes-select is-dark">
            <select bind:value={valueGame}>
                <option value={120}
                    >{isMobile()
                        ? translator._("menu.settings.game-quality.short.high")
                        : translator._("menu.settings.game-quality.long.high")}</option
                >
                <option value={60}
                    >{isMobile()
                        ? translator._("menu.settings.game-quality.short.medium")
                        : translator._("menu.settings.game-quality.long.medium")}</option
                >
                <option value={40}
                    >{isMobile()
                        ? translator._("menu.settings.game-quality.short.minimum")
                        : translator._("menu.settings.game-quality.long.minimum")}</option
                >
                <option value={20}
                    >{isMobile()
                        ? translator._("menu.settings.game-quality.short.small")
                        : translator._("menu.settings.game-quality.long.small")}</option
                >
            </select>
        </div>
    </section>
    <section>
        <h3>{translator._("menu.settings.video-quality.title")}</h3>
        <div class="nes-select is-dark">
            <select bind:value={valueVideo}>
                <option value={30}
                    >{isMobile()
                        ? translator._("menu.settings.video-quality.short.high")
                        : translator._("menu.settings.video-quality.long.high")}</option
                >
                <option value={20}
                    >{isMobile()
                        ? translator._("menu.settings.video-quality.short.medium")
                        : translator._("menu.settings.video-quality.long.medium")}</option
                >
                <option value={10}
                    >{isMobile()
                        ? translator._("menu.settings.video-quality.short.minimum")
                        : translator._("menu.settings.video-quality.long.minimum")}</option
                >
                <option value={5}
                    >{isMobile()
                        ? translator._("menu.settings.video-quality.short.small")
                        : translator._("menu.settings.video-quality.long.small")}</option
                >
            </select>
        </div>
    </section>
    <section>
        <h3>{translator._("menu.settings.language.title")}</h3>
        <div class="nes-select is-dark">
            <select class="languages-switcher" bind:value={valueLanguage}>
                <!-- svelte-ignore missing-declaration -->
                {#each languages as language}
                    <option value={language.id}>{`${language.language} (${language.country})`}</option>
                {/each}
            </select>
        </div>
    </section>
    <section class="settings-section-save">
        <p>{translator._("menu.settings.save.warning")}</p>
        <button type="button" class="nes-btn is-primary" on:click|preventDefault={saveSetting}
            >{translator._("menu.settings.save.button")}</button
        >
    </section>
    <section class="settings-section-noSaveOption">
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={fullscreen}
                on:change={changeFullscreen}
            />
            <span>{translator._("menu.settings.fullscreen")}</span>
        </label>
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={notification}
                on:change={changeNotification}
            />
            <span>{translator._("menu.settings.notifications")}</span>
        </label>
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={forceCowebsiteTrigger}
                on:change={changeForceCowebsiteTrigger}
            />
            <span>{translator._("menu.settings.cowebsite-trigger")}</span>
        </label>
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={ignoreFollowRequests}
                on:change={changeIgnoreFollowRequests}
            />
            <span>{translator._("menu.settings.ignore-follow-request")}</span>
        </label>
    </section>
</div>

<style lang="scss">
    div.settings-main {
        height: calc(100% - 40px);
        overflow-y: auto;

        section {
            width: 100%;
            padding: 20px 20px 0;
            margin-bottom: 20px;
            text-align: center;

            div.nes-select select:focus {
                outline: none;
            }
        }
        section.settings-section-save {
            text-align: center;
            p {
                margin: 16px 0;
            }
        }
        section.settings-section-noSaveOption {
            display: flex;
            align-items: center;
            flex-wrap: wrap;

            label {
                flex: 1 1 auto;
                text-align: center;
                margin: 0 0 15px;
            }
        }

        .languages-switcher option {
            text-transform: capitalize;
        }
    }

    @media only screen and (max-width: 800px), only screen and (max-height: 800px) {
        div.settings-main {
            section {
                padding: 0;
            }
        }
    }
</style>
