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
        // An image's file, fetched by every viewer with their map-storage token: a URL or a path here would send
        // that token elsewhere. Excalidraw's own ids are SHA-1 hashes in hex.
        fileId: z
            .string()
            .regex(/^[A-Za-z0-9_-]{1,64}$/)
            .nullable()
            .optional(),
    })
    .passthrough();
export type WhiteboardElement = z.infer<typeof WhiteboardElement>;

export const MAX_ELEMENTS_PER_MESSAGE = 5000;
// Deleted elements count too until they are pruned: a board is not meant to hold a whole diagram library.
export const MAX_ELEMENTS_PER_BOARD = 20000;
// The whole board travels in one gRPC message (join, save), capped at 20 MB: keep well below.
export const MAX_BOARD_BYTES = 10 * 1024 * 1024;
// A long freehand line is the biggest element Excalidraw makes, far below this.
export const MAX_ELEMENT_BYTES = 1024 * 1024;

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
    private readonly elementBytes = new Map<string, number>();
    private bytes = 0;

    constructor(initialElements: WhiteboardElement[] = []) {
        for (const element of initialElements) {
            this.set(element);
        }
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
            const elementBytes = byteSize(element);
            const tooBig =
                elementBytes > MAX_ELEMENT_BYTES ||
                this.bytes - (this.elementBytes.get(element.id) ?? 0) + elementBytes > MAX_BOARD_BYTES;
            if (tooBig) {
                if (existing !== undefined) {
                    outdated.push(existing);
                }
                continue;
            }
            if (isNewerElement(element, existing)) {
                this.set(element, elementBytes);
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
            this.set(copy);
            deleted.push(copy);
        }
        return deleted;
    }

    /** Forgets the elements deleted before that time: past it, nobody can undo their deletion anymore. */
    public pruneDeletedBefore(time: number): void {
        for (const [id, element] of this.elements) {
            if (element.isDeleted === true && (element.updated ?? 0) < time) {
                this.elements.delete(id);
                this.bytes -= this.elementBytes.get(id) ?? 0;
                this.elementBytes.delete(id);
            }
        }
    }

    public getElements(): WhiteboardElement[] {
        return [...this.elements.values()];
    }

    public get size(): number {
        return this.elements.size;
    }

    private set(element: WhiteboardElement, elementBytes = byteSize(element)): void {
        this.bytes += elementBytes - (this.elementBytes.get(element.id) ?? 0);
        this.elementBytes.set(element.id, elementBytes);
        this.elements.set(element.id, element);
    }
}

function byteSize(element: WhiteboardElement): number {
    return Buffer.byteLength(JSON.stringify(element));
}
