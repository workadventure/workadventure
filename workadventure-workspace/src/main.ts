/// <reference types="@workadventure/iframe-api-typings" />

const WORKSPACE_ID = 'e2e-fix';
const DEFAULT_WORKSPACE_APP_URL = `http://127.0.0.1:5174/?workspace=${WORKSPACE_ID}`;
const TRIGGER_AREA = 'workspaceStationTrigger';
const POPUP_ANCHOR = 'workspaceStationPopupAnchor';

type PopupHandle = ReturnType<typeof WA.ui.openPopup>;

let stationPopup: PopupHandle | undefined;
let workspaceCoWebsite: Awaited<ReturnType<typeof WA.nav.openCoWebSite>> | undefined;

function getWorkspaceUrl(): string {
  return DEFAULT_WORKSPACE_APP_URL;
}

function closeStationPopup(): void {
  stationPopup?.close();
  stationPopup = undefined;
}

async function openWorkspace(): Promise<void> {
  closeStationPopup();

  if (workspaceCoWebsite) {
    try {
      workspaceCoWebsite.close();
    } catch (error) {
      console.warn('Unable to close previous workspace co-website', error);
    }
  }

  workspaceCoWebsite = await WA.nav.openCoWebSite(getWorkspaceUrl(), false, '', 70, 0, true, false);
}

function showStationPopup(): void {
  if (stationPopup) return;

  stationPopup = WA.ui.openPopup(POPUP_ANCHOR, 'Open saved workspace “e2e-fix”?', [
    {
      label: 'Open workspace',
      className: 'primary',
      callback: async (popup) => {
        popup.close();
        stationPopup = undefined;
        await openWorkspace();
      },
    },
    {
      label: 'Not now',
      className: 'normal',
      callback: (popup) => {
        popup.close();
        stationPopup = undefined;
      },
    },
  ]);
}

WA.onInit()
  .then(() => {
    console.info('e2e-fix ops room ready');

    WA.room.area.onEnter(TRIGGER_AREA).subscribe(() => {
      showStationPopup();
    });

    WA.room.area.onLeave(TRIGGER_AREA).subscribe(() => {
      closeStationPopup();
    });

    WA.ui.registerMenuCommand('Open e2e-fix workspace', {
      callback: () => {
        void openWorkspace();
      },
      key: 'open-e2e-fix-workspace',
    });
  })
  .catch((error) => console.error('Failed to initialize e2e-fix ops room', error));

export {};
