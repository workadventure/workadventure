import type { MatrixSecurity } from "./MatrixSecurity";

/**
 * MatrixSecurity pulls in matrix-js-sdk, which only the users who get a Matrix chat download: code that can run for
 * anybody loads it through this function, never with a static import. Once a Matrix chat exists, the module is already
 * loaded and this resolves right away.
 */
export async function getMatrixSecurity(): Promise<MatrixSecurity> {
    return (await import("./MatrixSecurity")).matrixSecurity;
}
