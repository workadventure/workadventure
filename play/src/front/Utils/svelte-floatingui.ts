// This is a port of svelte-popperjs using Floating UI instead in Svelte 3.0
// When we later migrate to Svelte 5, we can use the new Svelte 5 version of svelte-floatingui

import type { Readable } from "svelte/store";
import {
    computePosition,
    flip,
    shift,
    //offset,
    //arrow,
    autoUpdate,
} from "@floating-ui/dom";
import {
    //createPopper,
    //Instance,
    OptionsGeneric,
    Modifier,
    type VirtualElement,
} from "@popperjs/core";
import { onDestroy } from "svelte";
export type { VirtualElement } from "@popperjs/core";

export type PopperOptions<TModifier> = Partial<OptionsGeneric<TModifier>> | undefined;

export type ReferenceAction = (node: Element | VirtualElement | Readable<VirtualElement>) => {
    destroy?(): void;
};

export type ContentAction<TModifier> = (
    node: HTMLElement,
    popperOptions?: PopperOptions<TModifier>
) => {
    update(popperOptions: PopperOptions<TModifier>): void;
    destroy(): void;
};

export function createFlotingUiActions<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TModifier extends Partial<Modifier<any, any>>
>(initOptions?: PopperOptions<TModifier>): [ReferenceAction, ContentAction<TModifier>] {
    let cleanup: (() => void) | null = null;
    let referenceNode: VirtualElement | Element | undefined;
    let contentNode: HTMLElement | undefined;
    //let options: PopperOptions<TModifier> | undefined = initOptions;

    const initFloatingUi = () => {
        if (referenceNode !== undefined && contentNode !== undefined) {
            cleanup = autoUpdate(referenceNode, contentNode, () => {
                if (referenceNode && contentNode) {
                    computePosition(referenceNode, contentNode, {
                        placement: "top",
                        middleware: [flip(), shift({ padding: 5 })],
                    })
                        .then(({ x, y }) => {
                            if (contentNode) {
                                Object.assign(contentNode.style, {
                                    left: `${x}px`,
                                    top: `${y}px`,
                                });
                            }
                        })
                        .catch((e) => {
                            console.error(e);
                        });
                }
            });
        }
    };

    const deinitFloatingUi = () => {
        if (cleanup !== null) {
            cleanup();
            cleanup = null;
        }
    };

    const referenceAction: ReferenceAction = (node) => {
        if ("subscribe" in node) {
            setupVirtualElementObserver(node);
            return {};
        } else {
            referenceNode = node;
            initFloatingUi();
            return {
                destroy() {
                    deinitFloatingUi();
                },
            };
        }
    };

    const setupVirtualElementObserver = (node: Readable<VirtualElement>) => {
        const unsubscribe = node.subscribe(($node) => {
            if (referenceNode === undefined) {
                referenceNode = $node;
                initFloatingUi();
            } else {
                // Preserve the reference to the virtual element.
                Object.assign(referenceNode, $node);
                console.error("Don't know what to do here");
                //popperInstance?.update();
            }
        });
        onDestroy(unsubscribe);
    };

    const contentAction: ContentAction<TModifier> = (node, contentOptions?) => {
        contentNode = node;
        //options = { ...initOptions, ...contentOptions };
        initFloatingUi();
        return {
            update(newContentOptions: PopperOptions<TModifier>) {
                //options = { ...initOptions, ...newContentOptions };
                //popperInstance?.setOptions(options);
                console.error("Don't know how to update options");
            },
            destroy() {
                deinitFloatingUi();
            },
        };
    };

    return [referenceAction, contentAction];
}
