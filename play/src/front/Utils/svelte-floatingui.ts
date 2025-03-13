// This is a port of svelte-popperjs using Floating UI instead in Svelte 3.0
// When we later migrate to Svelte 5, we can use the new Svelte 5 version of svelte-floatingui

import type { Readable } from "svelte/store";
import {
    computePosition,
    flip,
    shift,
    offset,
    //arrow,
    autoUpdate,
    ComputePositionConfig,
    arrow,
    limitShift,
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

export type ArrowAction = (node: HTMLElement) => {
    destroy?(): void;
};

export function createFlotingUiActions<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TModifier extends Partial<Modifier<any, any>>
>(initOptions?: Partial<ComputePositionConfig>): [ReferenceAction, ContentAction<TModifier>, ArrowAction] {
    let cleanup: (() => void) | null = null;
    let referenceNode: VirtualElement | Element | undefined;
    let contentNode: HTMLElement | undefined;
    let arrowNode: HTMLElement | undefined;
    const options: Partial<ComputePositionConfig> | undefined = initOptions;

    const updatePosition = () => {
        if (referenceNode && contentNode) {
            const middlewares = [flip(), shift({ padding: 5, limiter: limitShift() }), offset({ mainAxis: 8 })];
            if (arrowNode) {
                middlewares.push(arrow({ element: arrowNode }));
            }

            computePosition(referenceNode, contentNode, {
                placement: "top",
                ...options,
                middleware: middlewares,
            })
                .then(({ x, y, placement, middlewareData }) => {
                    if (contentNode) {
                        Object.assign(contentNode.style, {
                            left: `${x}px`,
                            top: `${y}px`,
                        });

                        if (arrowNode) {
                            const { x: arrowX, y: arrowY } = middlewareData.arrow;
                            const staticSide = {
                                top: "bottom",
                                right: "left",
                                bottom: "top",
                                left: "right",
                            }[placement.split("-")[0]];

                            if (staticSide === undefined) {
                                throw new Error("Invalid placement");
                            }
                            Object.assign(arrowNode.style, {
                                left: arrowX != null ? `${arrowX}px` : "",
                                top: arrowY != null ? `${arrowY}px` : "",
                                right: "",
                                bottom: "",
                                [staticSide]: "-4px",
                            });
                            arrowNode.classList.add("floating-ui-arrow");
                            arrowNode.dataset.arrowPlacement = staticSide;
                        }
                    }
                })
                .catch((e) => {
                    console.error(e);
                });
        }
    };

    const initFloatingUi = () => {
        if (referenceNode !== undefined && contentNode !== undefined) {
            if (cleanup) {
                // Is this normal?
                cleanup();
            }
            cleanup = autoUpdate(referenceNode, contentNode, () => {
                updatePosition();
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
                updatePosition();
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

    const arrowAction: ArrowAction = (node) => {
        if ("subscribe" in node) {
            setupVirtualElementObserver(node);
            return {};
        } else {
            arrowNode = node;
            initFloatingUi();
            return {
                destroy() {
                    deinitFloatingUi();
                },
            };
        }
    };

    return [referenceAction, contentAction, arrowAction];
}
