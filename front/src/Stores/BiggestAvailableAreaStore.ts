import { writable } from "svelte/store";
import type { Box } from "../WebRtc/LayoutManager";
import { HtmlUtils } from "../WebRtc/HtmlUtils";
import { MathUtils } from "../Utils/MathUtils";

/**
 * Tries to find the biggest available box of remaining space (this is a space where we can center the character)
 */
function findBiggestAvailableArea(): Box {
    const game = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");
    // map iframes to Box'es and remove ones outside of the game canvas space
    const iframeBoxes: Box[] = Array.from(document.getElementsByTagName("iframe"))
        .filter((iframe) => iframe.offsetLeft < game.offsetWidth)
        .map((iframe) => ({
            xStart: iframe.offsetLeft,
            yStart: iframe.offsetTop,
            xEnd: iframe.offsetLeft + iframe.offsetWidth,
            yEnd: iframe.offsetTop + iframe.offsetHeight,
        }));

    // console.log(Array.from(document.getElementsByClassName("video-container")));
    // const videoContainers: Box[] =

    // create vertices arrays and insert game canvas edges
    const xVertices = [game.offsetLeft, game.offsetWidth];
    const yVertices = [game.offsetTop, game.offsetHeight];

    // populate with all vertices
    for (const box of iframeBoxes) {
        xVertices.push(box.xStart, box.xEnd);
        yVertices.push(box.yStart, box.yEnd);
    }
    xVertices.sort();
    yVertices.sort();

    // NOTE: cannot use fill() here, it makes references to a single array
    const occupiedSpace: boolean[][] = new Array(xVertices.length);
    for (let x = 0; x < xVertices.length; x += 1) {
        occupiedSpace[x] = new Array(yVertices.length);
    }

    // check if given vertex is a part of something occupying the view
    for (let x = 0; x < xVertices.length; x += 1) {
        for (let y = 0; y < yVertices.length; y += 1) {
            occupiedSpace[x][y] = isPartOfBoxes(xVertices[x], yVertices[y], iframeBoxes);
        }
    }

    // create an array of all possible squares
    const allSquares: Box[] = [];
    for (let x = 0; x < occupiedSpace.length - 1; x += 1) {
        for (let y = 0; y < occupiedSpace[x].length - 1; y += 1) {
            allSquares.push(...findAllFreeBoxes(x, y, occupiedSpace));
        }
    }
    // console.log(allSquares);

    // remove squares with occupied areas
    const freeSquares = allSquares.filter((square) => {
        // TODO: check every box not just iframes
        return !isOverlappingWithBoxes(square, iframeBoxes, xVertices, yVertices);
    });

    console.log(freeSquares);

    // get biggest free square
    const freeSquaresAreas = freeSquares
        .map((square) => ({ square, area: getBoxArea(square, xVertices, yVertices) }))
        .sort((a, b) => {
            if (a.area < b.area) {
                return 1;
            }
            if (a.area > b.area) {
                return -1;
            }
            return 0;
        });

    const biggestFreeAreaSquare = freeSquaresAreas[0].square;
    const freeSpace = {
        xStart: xVertices[biggestFreeAreaSquare.xStart],
        xEnd: xVertices[biggestFreeAreaSquare.xEnd],
        yStart: yVertices[biggestFreeAreaSquare.yStart],
        yEnd: yVertices[biggestFreeAreaSquare.yEnd],
    };

    // console.log(freeSpace);
    return freeSpace;

    // console.log(occupiedSpace);
    // console.log(`game: ${game.offsetLeft}, ${game.offsetTop}, ${game.offsetWidth}, ${game.offsetHeight}`);
    // console.log('______________');
    // console.log(`xVertices: ${xVertices}`);
    // console.log(`YVertices: ${yVertices}`);
}

function isPartOfBoxes(x: number, y: number, boxes: Box[]): boolean {
    for (const box of boxes) {
        if (x >= box.xStart && x <= box.xEnd && y >= box.yStart && y <= box.yEnd) {
            return true;
        }
    }
    return false;
}

function isOverlappingWithBoxes(box: Box, targetBoxes: Box[], xVertices: number[], yVertices: number[]): boolean {
    for (const target of targetBoxes) {
        if (
            MathUtils.doRectanglesOverlap(
                {
                    x: xVertices[box.xStart],
                    y: yVertices[box.yStart],
                    width: xVertices[box.xEnd] - xVertices[box.xStart],
                    height: yVertices[box.yEnd] - yVertices[box.yStart],
                },
                {
                    x: target.xStart,
                    y: target.yStart,
                    width: target.xEnd - target.xStart,
                    height: target.yEnd - target.yStart,
                }
            )
        ) {
            return true;
        }
    }
    return false;
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
            set(findBiggestAvailableArea());
        },
    };
}

export function findAllFreeBoxes(left: number, top: number, grid: boolean[][]): Box[] {
    if (grid.length === 0) {
        return [];
    }
    if (grid[0].length === 0) {
        return [];
    }
    if (grid[top][left] === true) {
        return [];
    }

    const squares: Box[] = [];

    // we expect grid rows to be of the same length
    let xEnd = grid[0].length;

    for (let y = top; y < grid.length; y += 1) {
        for (let x = left; x < xEnd; x += 1) {
            // do not add squares with occupied parts
            if (grid[y][x] === true) {
                // no point in trying to find free square after this column
                xEnd = x;
                break;
            }
            squares.push({ xStart: left, yStart: top, xEnd: x, yEnd: y });
        }
    }

    return squares;
}

export function getGridCoordinates(x: number, y: number, verticesX: number[], verticesY: number[]): [number, number] {
    return [verticesX.findIndex((vertexX) => vertexX === x), verticesY.findIndex((vertexY) => vertexY === y)];
}

export const biggestAvailableAreaStore = createBiggestAvailableAreaStore();
