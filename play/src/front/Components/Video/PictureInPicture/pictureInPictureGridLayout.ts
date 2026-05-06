/**
 * Grilles simples pour la bande vidéo Picture-in-Picture (max 8 tuiles).
 * Règles demandées : adapter au ratio du conteneur (portrait = height > width).
 */

export const PIP_GRID_MAX_VIDEOS = 8;

/** Lignes de grille CSS 1-based, fin **exclusive** (comme grid-column: a / b). */
export type PipGridTile = {
    columnStart: number;
    columnEnd: number;
    rowStart: number;
    rowEnd: number;
};

export type PipGridLayout = {
    portrait: boolean;
    videoCount: number;
    /** Nombre de colonnes de piste (lignes de grille = colonnes + 1). */
    columnTracks: number;
    /** Nombre de lignes de piste. */
    rowTracks: number;
    tiles: PipGridTile[];
    /** Résumé lisible pour debug / page de test. */
    description: string;
};

function clampCount(n: number): number {
    if (!Number.isFinite(n) || n < 0) {
        return 0;
    }
    return Math.min(PIP_GRID_MAX_VIDEOS, Math.floor(n));
}

/**
 * Colonnes égales : `repeat(n, minmax(0, 1fr))`.
 * Lignes égales : idem avec `rowTracks`.
 */
export function pipGridTemplateColumns(columnTracks: number): string {
    return `repeat(${Math.max(1, columnTracks)}, minmax(0, 1fr))`;
}

export function pipGridTemplateRows(rowTracks: number): string {
    return `repeat(${Math.max(1, rowTracks)}, minmax(0, 1fr))`;
}

/**
 * Calcule la disposition des tuiles (indices 0 … n-1).
 */
export function computePictureInPictureGridLayout(
    videoCount: number,
    containerWidth: number,
    containerHeight: number
): PipGridLayout {
    const n = clampCount(videoCount);
    const portrait = containerHeight > containerWidth;

    const isFullWidth = containerWidth > containerHeight * 3;
    if (isFullWidth) {
        return {
            portrait: false,
            videoCount: n,
            columnTracks: n,
            rowTracks: 1,
            // Create a grid with all videos in one row
            tiles: Array.from({ length: n }, (_, i) => ({
                columnStart: i + 1,
                columnEnd: i + 2,
                rowStart: 1,
                rowEnd: 2,
            })),
            description: `${n} vidéos : plein cadre (w×4 > h)`,
        };
    }

    const isFullHeight = containerHeight > containerWidth * 2;
    if (isFullHeight) {
        return {
            portrait: true,
            videoCount: n,
            columnTracks: 1,
            rowTracks: n,
            tiles: Array.from({ length: n }, (_, i) => ({
                columnStart: 1,
                columnEnd: 2,
                rowStart: i + 1,
                rowEnd: i + 2,
            })),
            description: `${n} vidéos : plein hauteur (h×4 > w)`,
        };
    }

    if (n === 0) {
        return {
            portrait,
            videoCount: n,
            columnTracks: 1,
            rowTracks: 1,
            tiles: [],
            description: "Aucune vidéo",
        };
    }

    if (n === 1) {
        return {
            portrait,
            videoCount: n,
            columnTracks: 1,
            rowTracks: 1,
            tiles: [{ columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 }],
            description: "1 vidéo : plein cadre",
        };
    }

    if (n === 2) {
        if (portrait) {
            return {
                portrait,
                videoCount: n,
                columnTracks: 1,
                rowTracks: 2,
                tiles: [
                    { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                ],
                description: "2 vidéos portrait : colonne",
            };
        }
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 1,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
            ],
            description: "2 vidéos paysage : ligne",
        };
    }

    if (n === 3) {
        if (portrait) {
            // 2 en haut, 1 en bas (pleine largeur)
            return {
                portrait,
                videoCount: n,
                columnTracks: 2,
                rowTracks: 2,
                tiles: [
                    { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                    { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                ],
                description: "3 portrait : 2 haut + 1 bas",
            };
        }
        // 1 à gauche (hauteur pleine), 2 empilées à droite
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 2,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
            ],
            description: "3 paysage : 1 gauche + 2 colonne droite",
        };
    }

    if (n === 4) {
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 2,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
            ],
            description: "4 : grille 2×2",
        };
    }

    if (n === 5) {
        if (portrait) {
            // 3 en haut, 2 en bas — 6 colonnes virtuelles : haut 2+2+2, bas 3+3
            return {
                portrait,
                videoCount: n,
                columnTracks: 6,
                rowTracks: 2,
                tiles: [
                    { columnStart: 1, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                    { columnStart: 3, columnEnd: 5, rowStart: 1, rowEnd: 2 },
                    { columnStart: 5, columnEnd: 7, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 4, rowStart: 2, rowEnd: 3 },
                    { columnStart: 4, columnEnd: 7, rowStart: 2, rowEnd: 3 },
                ],
                description: "5 portrait : 3 haut + 2 bas",
            };
        }
        // 2 gauche empilées, 3 droite empilées (grille 2 col × 3 lignes)
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 3,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                { columnStart: 1, columnEnd: 2, rowStart: 3, rowEnd: 4 },
                { columnStart: 2, columnEnd: 3, rowStart: 3, rowEnd: 4 },
            ],
            description: "5 paysage : 2 colonne gauche + 2 colonne droite + 1 ligne en bas",
        };
    }

    if (n === 6) {
        if (portrait) {
            return {
                portrait,
                videoCount: n,
                columnTracks: 3,
                rowTracks: 2,
                tiles: [
                    { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                    { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                    { columnStart: 3, columnEnd: 4, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                    { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                    { columnStart: 3, columnEnd: 4, rowStart: 2, rowEnd: 3 },
                ],
                description: "6 portrait : 3×2",
            };
        }
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 3,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                { columnStart: 1, columnEnd: 2, rowStart: 3, rowEnd: 4 },
                { columnStart: 2, columnEnd: 3, rowStart: 3, rowEnd: 4 },
            ],
            description: "6 paysage : 2×3",
        };
    }

    if (n === 7) {
        if (portrait) {
            // 4 haut + 3 bas (12 colonnes : haut 3 chacune, bas 4 chacune)
            return {
                portrait,
                videoCount: n,
                columnTracks: 12,
                rowTracks: 2,
                tiles: [
                    { columnStart: 1, columnEnd: 4, rowStart: 1, rowEnd: 2 },
                    { columnStart: 4, columnEnd: 7, rowStart: 1, rowEnd: 2 },
                    { columnStart: 7, columnEnd: 10, rowStart: 1, rowEnd: 2 },
                    { columnStart: 10, columnEnd: 13, rowStart: 1, rowEnd: 2 },
                    { columnStart: 1, columnEnd: 5, rowStart: 2, rowEnd: 3 },
                    { columnStart: 5, columnEnd: 9, rowStart: 2, rowEnd: 3 },
                    { columnStart: 9, columnEnd: 13, rowStart: 2, rowEnd: 3 },
                ],
                description: "7 portrait : 4 haut + 3 bas",
            };
        }
        // 3 gauche + 4 droite (4 lignes)
        return {
            portrait,
            videoCount: n,
            columnTracks: 2,
            rowTracks: 4,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 2, rowStart: 3, rowEnd: 4 },
                { columnStart: 1, columnEnd: 2, rowStart: 4, rowEnd: 5 },
                { columnStart: 1, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 3, rowEnd: 4 },
                { columnStart: 2, columnEnd: 3, rowStart: 4, rowEnd: 5 },
            ],
            description: "7 paysage : 3 gauche + 4 droite",
        };
    }

    // n === 8
    if (portrait) {
        return {
            portrait,
            videoCount: n,
            columnTracks: 4,
            rowTracks: 2,
            tiles: [
                { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
                { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
                { columnStart: 3, columnEnd: 4, rowStart: 1, rowEnd: 2 },
                { columnStart: 4, columnEnd: 5, rowStart: 1, rowEnd: 2 },
                { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
                { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
                { columnStart: 3, columnEnd: 4, rowStart: 2, rowEnd: 3 },
                { columnStart: 4, columnEnd: 5, rowStart: 2, rowEnd: 3 },
            ],
            description: "8 portrait : 4×2",
        };
    }
    return {
        portrait,
        videoCount: n,
        columnTracks: 2,
        rowTracks: 4,
        tiles: [
            { columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 },
            { columnStart: 2, columnEnd: 3, rowStart: 1, rowEnd: 2 },
            { columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
            { columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
            { columnStart: 1, columnEnd: 2, rowStart: 3, rowEnd: 4 },
            { columnStart: 2, columnEnd: 3, rowStart: 3, rowEnd: 4 },
            { columnStart: 1, columnEnd: 2, rowStart: 4, rowEnd: 5 },
            { columnStart: 2, columnEnd: 3, rowStart: 4, rowEnd: 5 },
        ],
        description: "8 paysage : 2×4",
    };
}

export function pipTileStyle(t: PipGridTile): string {
    return `grid-column: ${t.columnStart} / ${t.columnEnd}; grid-row: ${t.rowStart} / ${t.rowEnd};`;
}
