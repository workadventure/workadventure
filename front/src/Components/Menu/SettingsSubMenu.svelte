<script lang="typescript">
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import { videoConstraintStore } from "../../Stores/MediaStore";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import { isMobile } from "../../Enum/EnvironmentVariable";
    import { menuVisiblilityStore } from "../../Stores/MenuStore";

    let fullscreen: boolean = localUserStore.getFullscreen();
    let notification: boolean = localUserStore.getNotification() === "granted";
    let forceCowebsiteTrigger: boolean = localUserStore.getForceCowebsiteTrigger();
    let ignoreFollowRequests: boolean = localUserStore.getIgnoreFollowRequests();
    let valueGame: number = localUserStore.getGameQualityValue();
    let valueVideo: number = localUserStore.getVideoQualityValue();
    let previewValueGame = valueGame;
    let previewValueVideo = valueVideo;

    function saveSetting() {
        if (valueGame !== previewValueGame) {
            previewValueGame = valueGame;
            localUserStore.setGameQualityValue(valueGame);
            window.location.reload();
        }

        if (valueVideo !== previewValueVideo) {
            previewValueVideo = valueVideo;
            videoConstraintStore.setFrameRate(valueVideo);
        }

        closeMenu();
    }

    function changeFullscreen() {
        const body = HtmlUtils.querySelectorOrFail("body");
        if (body) {
            if (document.fullscreenElement !== null && !fullscreen) {
                document.exitFullscreen();
            } else {
                body.requestFullscreen();
            }
            localUserStore.setFullscreen(fullscreen);
        }
    }

    function changeNotification() {
        if (Notification.permission === "granted") {
            localUserStore.setNotification(notification ? "granted" : "denied");
        } else {
            Notification.requestPermission().then((response) => {
                if (response === "granted") {
                    localUserStore.setNotification(notification ? "granted" : "denied");
                } else {
                    localUserStore.setNotification("denied");
                    notification = false;
                }
            });
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
        <h3>Game quality</h3>
        <div class="nes-select is-dark">
            <select bind:value={valueGame}>
                <option value={120}>{isMobile() ? "High (120 fps)" : "High video quality (120 fps)"}</option>
                <option value={60}
                    >{isMobile() ? "Medium (60 fps)" : "Medium video quality (60 fps, recommended)"}</option
                >
                <option value={40}>{isMobile() ? "Minimum (40 fps)" : "Minimum video quality (40 fps)"}</option>
                <option value={20}>{isMobile() ? "Small (20 fps)" : "Small video quality (20 fps)"}</option>
            </select>
        </div>
    </section>
    <section>
        <h3>Video quality</h3>
        <div class="nes-select is-dark">
            <select bind:value={valueVideo}>
                <option value={30}>{isMobile() ? "High (30 fps)" : "High video quality (30 fps)"}</option>
                <option value={20}
                    >{isMobile() ? "Medium (20 fps)" : "Medium video quality (20 fps, recommended)"}</option
                >
                <option value={10}>{isMobile() ? "Minimum (10 fps)" : "Minimum video quality (10 fps)"}</option>
                <option value={5}>{isMobile() ? "Small (5 fps)" : "Small video quality (5 fps)"}</option>
            </select>
        </div>
    </section>
    <section class="settings-section-save">
        <p>(Saving these settings will restart the game)</p>
        <button type="button" class="nes-btn is-primary" on:click|preventDefault={saveSetting}>Save</button>
    </section>
    <section class="settings-section-noSaveOption">
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={fullscreen}
                on:change={changeFullscreen}
            />
            <span>Fullscreen</span>
        </label>
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={notification}
                on:change={changeNotification}
            />
            <span>Notifications</span>
        </label>
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={forceCowebsiteTrigger}
                on:change={changeForceCowebsiteTrigger}
            />
            <span>Always ask before opening websites and Jitsi Meet rooms</span>
        </label>
        <label>
            <input
                type="checkbox"
                class="nes-checkbox is-dark"
                bind:checked={ignoreFollowRequests}
                on:change={changeIgnoreFollowRequests}
            />
            <span>Ignore requests to follow other users</span>
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
    }

    @media only screen and (max-width: 800px), only screen and (max-height: 800px) {
        div.settings-main {
            section {
                padding: 0;
            }
        }
    }
</style>
