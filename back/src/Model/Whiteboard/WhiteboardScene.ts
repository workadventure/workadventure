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

const WhiteboardElements = z.array(WhiteboardElement).max(MAX_ELEMENTS_PER_MESSAGE);

/**
 * Throws when the payload is not a JSON array of elements.
 */
export function parseWhiteboardElements(json: string): WhiteboardElement[] {
    return WhiteboardElements.parse(JSON.parse(json));
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

    public getElements(): WhiteboardElement[] {
        return [...this.elements.values()];
    }

    public get size(): number {
        return this.elements.size;
    }
}
