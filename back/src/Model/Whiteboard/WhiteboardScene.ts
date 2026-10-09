import { z } from "zod";

/**
 * The fields of an Excalidraw element the back relies on. Every other field is kept verbatim: the element
 * schema belongs to Excalidraw, and losing one on the way (the fractional "index" in particular) makes the
 * clients silently discard each other's edits (excalidraw/excalidraw#11933).
 */
const WhiteboardElement = z
    .object({
        id: z.string().min(1).max(64),
        version: z.number().int().nonnegative(),
        versionNonce: z.number().int(),
        isDeleted: z.boolean().optional(),
        updated: z.number().optional(),
    })
    .passthrough();
export type WhiteboardElement = z.infer<typeof WhiteboardElement>;

export const MAX_ELEMENTS_PER_MESSAGE = 5000;
// Deleted elements count too until they are pruned: a board is not meant to hold a whole diagram library.
export const MAX_ELEMENTS_PER_BOARD = 20000;

/**
 * Throws when the payload is not a JSON array of elements. A message holds fewer elements than a whole board.
 */
export function parseWhiteboardElements(json: string, max = MAX_ELEMENTS_PER_MESSAGE): WhiteboardElement[] {
    return z.array(WhiteboardElement).max(max).parse(JSON.parse(json));
}

/**
 * Excalidraw's own rule (reconcileElements): the higher version wins, and on a tie the lower versionNonce,
 * so that every client and the back pick the same winner.
 */
export function isNewerElement(incoming: WhiteboardElement, existing: WhiteboardElement | undefined): boolean {
    if (existing === undefined) {
        return true;
    }
    if (incoming.version !== existing.version) {
        return incoming.version > existing.version;
    }
    return incoming.versionNonce < existing.versionNonce;
}

/**
 * The elements of one board, merged element by element.
 */
export class WhiteboardScene {
    private readonly elements = new Map<string, WhiteboardElement>();

    constructor(initialElements: WhiteboardElement[] = []) {
        this.merge(initialElements);
    }

    /**
     * Keeps the newer copy of each element. The stored copies of the elements that lost are returned
     * too, so that the sender can be brought back in line.
     */
    public merge(incoming: WhiteboardElement[]): { accepted: WhiteboardElement[]; outdated: WhiteboardElement[] } {
        const accepted: WhiteboardElement[] = [];
        const outdated: WhiteboardElement[] = [];
        for (const element of incoming) {
            const existing = this.elements.get(element.id);
            if (existing === undefined && this.elements.size >= MAX_ELEMENTS_PER_BOARD) {
                continue;
            }
            if (isNewerElement(element, existing)) {
                this.elements.set(element.id, element);
                accepted.push(element);
            } else if (
                existing !== undefined &&
                (existing.version !== element.version || existing.versionNonce !== element.versionNonce)
            ) {
                outdated.push(existing);
            }
        }
        return { accepted, outdated };
    }

    /**
     * Deletes every element the way Excalidraw does (a newer, deleted copy), so that every client drops them.
     */
    public clear(): WhiteboardElement[] {
        const deleted: WhiteboardElement[] = [];
        for (const element of this.elements.values()) {
            if (element.isDeleted === true) {
                continue;
            }
            const copy = {
                ...element,
                isDeleted: true,
                version: element.version + 1,
                versionNonce: Math.floor(Math.random() * 2 ** 31),
                updated: Date.now(),
            };
            this.elements.set(copy.id, copy);
            deleted.push(copy);
        }
        return deleted;
    }

    /** Forgets the elements deleted before that time: past it, nobody can undo their deletion anymore. */
    public pruneDeletedBefore(time: number): void {
        for (const [id, element] of this.elements) {
            if (element.isDeleted === true && (element.updated ?? 0) < time) {
                this.elements.delete(id);
            }
        }
    }

    public getElements(): WhiteboardElement[] {
        return [...this.elements.values()];
    }

    public get size(): number {
        return this.elements.size;
    }
}
