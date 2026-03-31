import type { MatrixClient } from "matrix-js-sdk";

/**
 * Custom account data: last WorkAdventure player name, used with getColorByString for chat avatar/tint color.
 * Readable/writable only for the logged-in user’s own account.
 */
export const WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE = "fr.workadventure.wa_display_name";

export type WorkAdventureWaDisplayNameAccountData = {
    name: string;
};

export function readWaDisplayNameFromMatrixAccountData(client: MatrixClient): string | undefined {
    const ev = client.getAccountData(WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE);
    const content = ev?.getContent();
    const name = content?.name?.trim();
    return name || undefined;
}

export async function writeWaDisplayNameToMatrixAccountData(client: MatrixClient, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
        return;
    }
    await client.setAccountData(WORKADVENTURE_WA_DISPLAY_NAME_ACCOUNT_DATA_TYPE, { name: trimmed });
}
