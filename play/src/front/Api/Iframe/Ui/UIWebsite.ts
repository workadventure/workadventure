import type {
    CreateUIWebsiteEvent,
    UIWebsiteCSSValue,
    UIWebsiteMargin,
    UIWebsitePosition,
    UIWebsiteSize,
    ViewportPositionHorizontal,
    ViewportPositionVertical,
    UIWebsiteEvent,
} from "../../Events/Ui/UIWebsiteEvent";
import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "../IframeApiContribution";

class UIWebsitePositionInternal {
    private readonly website: UIWebsite;
    private _vertical: ViewportPositionVertical;
    private _horizontal: ViewportPositionHorizontal;

    constructor(uiWebsite: UIWebsite, position: UIWebsitePosition) {
        this.website = uiWebsite;
        this._vertical = position.vertical;
        this._horizontal = position.horizontal;
    }

    public get vertical() {
        return this._vertical;
    }

    public set vertical(vertical: ViewportPositionVertical) {
        this._vertical = vertical;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.website.id,
                position: {
                    vertical: this._vertical,
                    horizontal: this._horizontal,
                },
            },
        });
    }

    public get horizontal() {
        return this._horizontal;
    }

    public set horizontal(horizontal: ViewportPositionHorizontal) {
        this._horizontal = horizontal;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.website.id,
                position: {
                    vertical: this._vertical,
                    horizontal: this._horizontal,
                },
            },
        });
    }
}

class UIWebsiteSizeInternal {
    private readonly website: UIWebsite;
    private _height: UIWebsiteCSSValue;
    private _width: UIWebsiteCSSValue;

    constructor(uiWebsite: UIWebsite, size: UIWebsiteSize) {
        this.website = uiWebsite;
        this._height = size.height;
        this._width = size.width;
    }

    public get height() {
        return this._height;
    }

    public set height(height: UIWebsiteCSSValue) {
        this._height = height;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.website.id,
                size: {
                    height: this._height,
                    width: this._width,
                },
            },
        });
    }

    public get width() {
        return this._height;
    }

    public set width(width: UIWebsiteCSSValue) {
        this._width = width;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.website.id,
                size: {
                    height: this._height,
                    width: this._width,
                },
            },
        });
    }
}

class UIWebsiteMarginInternal {
    private readonly website: UIWebsite;
    private _top?: UIWebsiteCSSValue;
    private _bottom?: UIWebsiteCSSValue;
    private _left?: UIWebsiteCSSValue;
    private _right?: UIWebsiteCSSValue;

    constructor(uiWebsite: UIWebsite, margin: UIWebsiteMargin) {
        this.website = uiWebsite;
        this._top = margin.top;
        this._bottom = margin.bottom;
        this._left = margin.left;
        this._right = margin.right;
    }

    public get top() {
        return this._top;
    }

    public set top(top: UIWebsiteCSSValue | undefined) {
        this._top = top;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.website.id,
                margin: {
                    top: this._top,
                },
            },
        });
    }

    public get bottom() {
        return this._bottom;
    }

    public set bottom(bottom: UIWebsiteCSSValue | undefined) {
        this._bottom = bottom;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.website.id,
                margin: {
                    bottom: this._bottom,
                },
            },
        });
    }

    public get left() {
        return this._left;
    }

    public set left(left: UIWebsiteCSSValue | undefined) {
        this._left = left;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.website.id,
                margin: {
                    left: this._left,
                },
            },
        });
    }

    public get right() {
        return this._right;
    }

    public set right(right: UIWebsiteCSSValue | undefined) {
        this._right = right;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.website.id,
                margin: {
                    right: this._right,
                },
            },
        });
    }
}

export class UIWebsite {
    public readonly id: string;
    private _url: string;
    private _visible: boolean;
    private readonly _allowPolicy: string;
    private readonly _allowApi: boolean;
    private _position: UIWebsitePositionInternal;
    private _size: UIWebsiteSizeInternal;
    private _margin: UIWebsiteMarginInternal;

    constructor(config: UIWebsiteEvent) {
        this.id = config.id;
        this._url = config.url;
        this._visible = config.visible ?? true;
        this._allowPolicy = config.allowPolicy ?? "";
        this._allowApi = config.allowApi ?? false;
        this._position = new UIWebsitePositionInternal(this, config.position);
        this._size = new UIWebsiteSizeInternal(this, config.size);
        this._margin = new UIWebsiteMarginInternal(this, config.margin ?? {});
    }

    public get url() {
        return this._url;
    }

    public set url(url: string) {
        this._url = url;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.id,
                url: this._url,
            },
        });
    }

    public get visible() {
        return this._visible;
    }

    public set visible(visible: boolean) {
        this._visible = visible;
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.id,
                visible: this._visible,
            },
        });
    }

    public get allowPolicy() {
        return this._allowPolicy;
    }

    public get allowApi() {
        return this._allowApi;
    }

    public get position() {
        return this._position;
    }

    public set position(position: UIWebsitePosition) {
        this._position = new UIWebsitePositionInternal(this, position);
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.id,
                position: {
                    vertical: this._position.vertical,
                    horizontal: this._position.horizontal,
                },
            },
        });
    }

    public get size() {
        return this._size;
    }

    public set size(size: UIWebsiteSize) {
        this._size = new UIWebsiteSizeInternal(this, size);
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.id,
                size: {
                    height: this._size.height,
                    width: this._size.width,
                },
            },
        });
    }

    public get margin() {
        return this._margin;
    }

    public set margin(margin: UIWebsiteMargin) {
        this._margin = new UIWebsiteMarginInternal(this, margin);
        sendToWorkadventure({
            type: "modifyUIWebsite",
            data: {
                id: this.id,
                margin: {
                    top: this._margin.top,
                    bottom: this._margin.bottom,
                    left: this._margin.left,
                    right: this._margin.right,
                },
            },
        });
    }

    close() {
        return queryWorkadventure({
            type: "closeUIWebsite",
            data: this.id,
        });
    }
}

export class UIWebsiteCommands extends IframeApiContribution<UIWebsiteCommands> {
    callbacks = [];

    /**
     * Open an iFrame that is fixed in the viewport. Use this for advanced popups, additional buttons in the UI, HUD, etc... Returns a promise of a UIWebsite instance.
     * {@link https://docs.workadventu.re/map-building/api-ui.md#display-a-ui-website | Website documentation}
     *
     * @param {CreateUIWebsiteEvent} createUIWebsite The details of the UIWebsite to create
     * @returns {Promise<UIWebsite>} Promise to return a UIWebsite
     */
    async open(createUIWebsite: CreateUIWebsiteEvent): Promise<UIWebsite> {
        const result = await queryWorkadventure({
            type: "openUIWebsite",
            data: createUIWebsite,
        });

        return new UIWebsite(result);
    }

    /**
     * Returns all UI websites (iframes positionned on the viewport)
     * {@link https://docs.workadventu.re/map-building/api-ui.md#get-all-ui-websites | Website documentation}
     *
     * @returns {Promise<UIWebsite[]>} Promise to return all UI websites
     */
    async getAll(): Promise<UIWebsite[]> {
        const result = await queryWorkadventure({
            type: "getUIWebsites",
            data: undefined,
        });

        return result.map((current) => new UIWebsite(current));
    }

    /**
     * Returns one UI website (iframe positionned on the viewport) by ID.
     * {@link https://docs.workadventu.re/map-building/api-ui.md#get-all-ui-websites | Website documentation}
     * @param {string} id The id of the UIWebsite
     * @returns {Promise<UIWebsite | undefined>} Promise to return UI website
     */
    async getById(id: string): Promise<UIWebsite | undefined> {
        const result = await queryWorkadventure({
            type: "getUIWebsiteById",
            data: id,
        });

        return new UIWebsite(result);
    }
}

export default new UIWebsiteCommands();
