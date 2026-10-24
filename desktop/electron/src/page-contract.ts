/**
 * Which world pages speak the desktop contract beyond contract 1 (what WorkAdventure servers older than
 * the desktop app speak: notify, the mute/camera shortcuts and the screen sources, nothing else).
 *
 * A page says `hello({ contract })` on every load. One that does not is an older WorkAdventure: its tab
 * gets the shortcuts, notifications and screen sharing, but no companion and no meeting bar, which that
 * page cannot render. Kept per page, since two tabs may be two servers of different versions.
 */

/** The contract this desktop app speaks. Raised only when the app must know a page can do something new. */
export const DESKTOP_CONTRACT = 2;

const pageContracts = new Map<number, number>();

export function recordHello(contents: Electron.WebContents, contract: unknown): void {
    if (typeof contract === "number" && Number.isInteger(contract) && contract >= 2) {
        pageContracts.set(contents.id, contract);
    }
}

/** A new page loads in this view (or it is gone): it has to say hello again. */
export function forgetPage(contents: Electron.WebContents): void {
    pageContracts.delete(contents.id);
}

/** The page in this view said hello: it renders the companion and the meeting bar. */
export function pageSaidHello(contents: Electron.WebContents): boolean {
    return pageContracts.has(contents.id);
}
