// This is a port of svelte-popperjs using Floating UI instead in Svelte 3.0
// When we later migrate to Svelte 5, we can use the new Svelte 5 version of svelte-floatingui

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

export type ReferenceAction = (node: Element) => {
    destroy?(): void;
};

export type ContentAction = (node: HTMLElement) => {
    destroy(): void;
};

export type ArrowAction = (node: HTMLElement) => {
    destroy?(): void;
};

export function createFloatingUiActions(
    initOptions?: Partial<ComputePositionConfig>,
    offsetMainAxis = 0
): [ReferenceAction, ContentAction, ArrowAction] {
    let cleanup: (() => void) | null = null;
    let referenceNode: Element | undefined;
    let contentNode: HTMLElement | undefined;
    let arrowNode: HTMLElement | undefined;
    const options: Partial<ComputePositionConfig> | undefined = initOptions;

    const updatePosition = () => {
        if (referenceNode && contentNode) {
            const middlewares = [
                flip(),
                shift({ padding: 5, limiter: limitShift() }),
                offset({ mainAxis: offsetMainAxis }),
            ];
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
                            const arrowX = middlewareData.arrow?.x;
                            const arrowY = middlewareData.arrow?.y;
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
        referenceNode = node;
        initFloatingUi();
        return {
            destroy() {
                deinitFloatingUi();
            },
        };
    };

    const contentAction: ContentAction = (node) => {
        contentNode = node;
        //options = { ...initOptions, ...contentOptions };
        initFloatingUi();
        return {
            destroy() {
                deinitFloatingUi();
            },
        };
    };

    const arrowAction: ArrowAction = (node) => {
        arrowNode = node;
        initFloatingUi();
        return {
            destroy() {
                deinitFloatingUi();
            },
        };
    };

    return [referenceAction, contentAction, arrowAction];
}
