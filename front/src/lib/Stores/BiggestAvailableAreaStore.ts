import { writable } from "svelte/store";
import type { Box } from "../WebRtc/LayoutManager";
import { HtmlUtils } from "../WebRtc/HtmlUtils";

/**
 * Tries to find the biggest available box of remaining space (this is a space where we can center the character)
 */
export function findBiggestAvailableArea(gameSize: { width: number; height: number }, blockers: Box[] = []): Box {
    const wholeScreenBox = {
        xStart: 0,
        yStart: 0,
        xEnd: gameSize.width,
        yEnd: gameSize.height,
    };

    if (blockers.length === 0) {
        return wholeScreenBox;
    }

    //clamp the blockers to the screen
    const clampedBlockers = clampAllBoxesToScreen(blockers, wholeScreenBox).filter(
        (box) => !isBoxTakingWholeScreen(box, gameSize)
    );

    // populate with all vertices
    const [verticesX, verticesY] = createVerticesArrays(wholeScreenBox, clampedBlockers);

    // NOTE: cannot use fill() here, it makes references to a single array
    const occupiedGrid: boolean[][] = createOccupiedGrid(verticesX, verticesY, clampedBlockers);

    // create an array of all free boxes
    const freeBoxes: Box[] = getAllFreeBoxes(occupiedGrid);

    const biggestBox = freeBoxes.length > 0 ? findBiggestFreeBox(freeBoxes, verticesX, verticesY) : wholeScreenBox;

    return {
        xStart: verticesX[biggestBox.xStart],
        yStart: verticesY[biggestBox.yStart],
        xEnd: verticesX[biggestBox.xEnd + 1],
        yEnd: verticesY[biggestBox.yEnd + 1],
    };
}

export function isBoxTakingWholeScreen(box: Box, gameSize: { width: number; height: number }): boolean {
    const xTakeWholeScreen = box.xStart <= 0 && box.xEnd >= gameSize.width;
    const yTakeWholeScreen = box.yStart <= 0 && box.yEnd >= gameSize.height;

    return xTakeWholeScreen && yTakeWholeScreen;
}

export function clampBoxToScreen(box: Box, screen: Box): Box {
    return {
        xStart: Math.min(Math.max(box.xStart, screen.xStart), screen.xEnd),
        yStart: Math.min(Math.max(box.yStart, screen.yStart), screen.yEnd),
        xEnd: Math.max(Math.min(box.xEnd, screen.xEnd), screen.xStart),
        yEnd: Math.max(Math.min(box.yEnd, screen.yEnd), screen.yStart),
    };
}

export function clampAllBoxesToScreen(boxes: Box[], screen: Box): Box[] {
    return boxes.map((box) => clampBoxToScreen(box, screen));
}

export function findBiggestFreeBox(freeBoxes: Box[], verticesX: number[], verticesY: number[]): Box {
    let biggestBox = freeBoxes[0];
    let biggestArea = getBoxArea(biggestBox, verticesX, verticesY);
    for (const box of freeBoxes) {
        const area = getBoxArea(box, verticesX, verticesY);
        if (area > biggestArea) {
            biggestArea = area;
            biggestBox = box;
        }
    }
    return biggestBox;
}

export function createVerticesArrays(canvas: Box, blockers: Box[]): [number[], number[]] {
    const verticesX: Set<number> = new Set([canvas.xStart, canvas.xEnd]);
    const verticesY: Set<number> = new Set([canvas.yStart, canvas.yEnd]);

    for (const box of [...blockers]) {
        verticesX.add(box.xStart);
        verticesX.add(box.xEnd);
        verticesY.add(box.yStart);
        verticesY.add(box.yEnd);
    }

    const verticesXArray = Array.from(verticesX).sort((a, b) => a - b);
    const verticesYArray = Array.from(verticesY).sort((a, b) => a - b);

    return [verticesXArray, verticesYArray];
}

function initializeOccupiedGrid(verticesX: number[], verticesY: number[]): boolean[][] {
    const occupiedGrid: boolean[][] = new Array(verticesY.length - 1);
    for (let j = 0; j < verticesY.length - 1; j += 1) {
        occupiedGrid[j] = new Array(verticesX.length - 1).fill(false);
    }
    return occupiedGrid;
}

export function createOccupiedGrid(verticesX: number[], verticesY: number[], blockers: Box[]): boolean[][] {
    const occupiedGrid: boolean[][] = initializeOccupiedGrid(verticesX, verticesY);

    for (const blocker of blockers) {
        const [left, top] = getGridCoordinates(blocker.xStart, blocker.yStart, verticesX, verticesY);
        const [right, bottom] = getGridCoordinates(blocker.xEnd, blocker.yEnd, verticesX, verticesY);
        for (let j = top; j < bottom; j += 1) {
            for (let i = left; i < right; i += 1) {
                occupiedGrid[j][i] = true;
            }
        }
    }
    return occupiedGrid;
}

export function getAllFreeBoxes(occupiedGrid: boolean[][]): Box[] {
    const freeBoxes: Box[] = [];
    for (let row = 0; row < occupiedGrid.length; row += 1) {
        for (let column = 0; column < occupiedGrid[row].length; column += 1) {
            freeBoxes.push(...findAllFreeBoxes(column, row, occupiedGrid));
        }
    }
    return freeBoxes;
}

export function getBoxArea(box: Box, xVertices: number[], yVertices: number[]): number {
    const width = xVertices[box.xEnd + 1] - xVertices[box.xStart];
    const height = yVertices[box.yEnd + 1] - yVertices[box.yStart];
    return width * height;
}

/**
 * A store that contains the list of (video) peers we are connected to.
 */
function createBiggestAvailableAreaStore() {
    const { subscribe, set } = writable<Box>({ xStart: 0, yStart: 0, xEnd: 1, yEnd: 1 });

    return {
        subscribe,
        recompute: () => {
            const game = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");

            const gameSize = {
                width: game.offsetWidth,
                height: game.offsetHeight,
            };

            const blockingElements = Array.from(document.getElementsByClassName("screen-blocker"));

            const blockingBoxes = blockingElements.map((element) => {
                const bounds = element.getBoundingClientRect();
                return {
                    xStart: bounds.x,
                    yStart: bounds.y,
                    xEnd: bounds.right,
                    yEnd: bounds.bottom,
                };
            });

            set(findBiggestAvailableArea(gameSize, blockingBoxes));
        },
    };
}

export function findAllFreeBoxes(column: number, row: number, grid: boolean[][]): Box[] {
    if (grid.length === 0) {
        return [];
    }
    if (grid[0].length === 0) {
        return [];
    }

    if (grid[row][column] === true) {
        return [];
    }

    const boxes: Box[] = [];

    // we expect grid rows to be of the same length
    let xEnd = grid[0].length;

    for (let y = row; y < grid.length; y += 1) {
        let found = false;
        const lastXEnd = xEnd;
        let x;
        for (x = column; x < xEnd; x += 1) {
            // do not add boxes with occupied parts
            if (grid[y][x] === true) {
                // no point in trying to find free box after this column
                xEnd = x;
                found = true;
                break;
            }
        }
        if (found || x === lastXEnd) {
            boxes.push({ xStart: column, yStart: row, xEnd: x - 1, yEnd: y });
        }
        if (x === column && grid[y][x] === true) {
            break;
        }
    }
    return boxes;
}

export function getGridCoordinates(x: number, y: number, verticesX: number[], verticesY: number[]): [number, number] {
    return [verticesX.findIndex((vertexX) => vertexX === x), verticesY.findIndex((vertexY) => vertexY === y)];
}

export const biggestAvailableAreaStore = createBiggestAvailableAreaStore();
