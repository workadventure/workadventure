import { writable } from "svelte/store";
import { SvelteComponent } from "svelte";
import { v4 } from "uuid";

export const bannerVisible = writable(true);
export const currentBannerIndex = writable(0);

interface Popup {
  uuid: string;
  component: typeof SvelteComponent;
  props: Props;
}

type Props = Record<string, any>
type SvelteComponentType = typeof SvelteComponent;


function createPopupStore() {
  const { subscribe, update } = writable<Popup[]>([]);

  return {
      subscribe,
      addPopup: (popup: SvelteComponentType, props: Props, uuid: string | undefined): void => {
          update((list: Popup[]) => {
              if (uuid === undefined) {
                uuid = v4();
              }
              list.push({
                uuid,
                component: popup,
                props,
              });
              return list;
          });
      },
      removePopup: (uuid: string): void => {
        update((list: Popup[]) => {
          const index = list.findIndex((item) => item.uuid === uuid);

          if (index !== -1) {
            list.splice(index, 1);
          }
          return list;
        });
      },
  };
}

export const popupStore = createPopupStore();
