<script lang="typescript">
import {localUserStore} from "../../Connexion/LocalUserStore";
import {HtmlUtils} from "../../WebRtc/HtmlUtils";
import {menuVisiblilityStore} from "../../Stores/MenuStore";

const qualityOption: Map<string, {video: number, audio: number}> = new Map([
    ['Low', { video: 4, audio: 64 }],
    ['Medium', { video: 275, audio: 126}],
    ['High', { video: 8000, audio: 256}],
])

let fullscreen : boolean = localUserStore.getFullscreen();
let notification : boolean = localUserStore.getNotification() === 'granted';
let selectedQuality: string = localUserStore.getQuality();

function saveSetting(){
    const qualityValue = qualityOption.get(selectedQuality);
    if (qualityValue) {
        localUserStore.setVideoQuality(qualityValue.video);
        localUserStore.setAudioQuality(qualityValue.audio);
        localUserStore.setQuality(selectedQuality);
    }

    closeMenu();
}

function changeQuality() {
    if (qualityOption.get(selectedQuality)) {
        console.log(qualityOption.get(selectedQuality));
    }
}

function changeFullscreen() {
    const body = HtmlUtils.querySelectorOrFail('body');
    if (body) {
        if (document.fullscreenElement !== null && !fullscreen) {
            document.exitFullscreen()
        } else {
            body.requestFullscreen();
        }
        localUserStore.setFullscreen(fullscreen);
    }
}

function changeNotification() {
    if (Notification.permission === 'granted') {
        localUserStore.setNotification(notification ? 'granted' : 'denied');
    } else {
        Notification.requestPermission().then((response) => {
            if (response === 'granted') {
                localUserStore.setNotification(notification ? 'granted' : 'denied');
            } else {
                localUserStore.setNotification('denied');
                notification = false;
            }
        })
    }
}

function closeMenu() {
    menuVisiblilityStore.set(false);
}
</script>

<div class="settings-main" on:submit|preventDefault={saveSetting}>
    <section>
        <h3>Video quality</h3>
        <div class="nes-select is-dark">
            <select bind:value="{selectedQuality}" on:change={changeQuality}>
                {#each [...qualityOption] as [optionKey, ]}
                    <option value="{optionKey}">{optionKey}</option>
                {/each}
            </select>
        </div>
    </section>
    <section class="settings-section-save">
        <button type="button" class="nes-btn is-primary" on:click|preventDefault={saveSetting}>Save</button>
    </section>
    <section class="settings-section-noSaveOption">
        <label>
            <input type="checkbox" class="nes-checkbox is-dark" bind:checked={fullscreen} on:change={changeFullscreen}/>
            <span>Fullscreen</span>
        </label>
        <label>
            <input type="checkbox" class="nes-checkbox is-dark" bind:checked={notification} on:change={changeNotification}>
            <span>Notifications</span>
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