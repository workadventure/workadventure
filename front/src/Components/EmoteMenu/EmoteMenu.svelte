<script lang="typescript">

  import { get } from "svelte/store";
  import type { Unsubscriber } from "svelte/store";
  import { emoteStore, emoteMenuStore } from "../../Stores/EmoteStore";
  import { onDestroy, onMount } from "svelte";
  import { EmojiButton } from '@joeattardi/emoji-button';
 
  let emojiContainer: HTMLElement;
  let picker: EmojiButton;

  let unsubscriber: Unsubscriber | null = null;

  onMount(() => {
    picker = new EmojiButton({
      rootElement: emojiContainer,
      style : 'twemoji',
      styleProperties: {
        '--font': 'Press Start 2P'
      },
      showSearch : false
    });

    picker.on("emoji", (selection) => {
      emoteStore.set(selection.emoji);
    });

    picker.on("hidden", () => {
      emoteMenuStore.closeEmoteMenu();
    });

    unsubscriber = emoteMenuStore.subscribe((isEmoteMenuVisible) => {
      if (isEmoteMenuVisible && !picker.isPickerVisible()) {
        picker.showPicker(emojiContainer);
      } else {
        picker.hidePicker();
      }
    })
  })

  onDestroy(() => {
    if (unsubscriber) {
      unsubscriber();
    }

    picker.destroyPicker();
  })

</script>

<div class="emote-menu-container">
  <div class="emote-menu" bind:this={emojiContainer}></div>
</div>

<style lang="scss">
  .emote-menu-container {
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
  }

  .emote-menu {
    pointer-events: all;
  }
</style>