interface Size {
    width: number;
    height: number;
}

export class HdpiManager {
    private _zoomModifier = 1;
    private _maxZoomOut = 1;
    private _optimalZoomLevel = 1;
    private _maxZoomInReached = false;
    private _mapSize: Size | undefined;

    /**
     *
     * @param minRecommendedGamePixelsNumber The minimum number of pixels we want to display "by default" to the user
     * @param absoluteMinPixelNumber The very minimum of game pixels to display. Below, we forbid zooming more
     */
    public constructor(
        private minRecommendedGamePixelsNumber: number,
        private absoluteMinPixelNumber: number,
    ) {}

    /**
     * Returns the optimal size in "game pixels" based on the screen size in "real pixels".
     *
     * Note: the function is returning the optimal size in "game pixels" in the "game" property,
     * but also recommends resizing the "real" pixel screen size of the canvas.
     * The proposed new real size is a few pixels bigger than the real size available (if the size is not a multiple of the pixel size) and should overflow.
     *
     * @param realPixelScreenSize
     */
    public getOptimalGameSize(realPixelScreenSize: Size): { game: Size; real: Size } {
        this._maxZoomInReached = false;
        const realPixelNumber = realPixelScreenSize.width * realPixelScreenSize.height;
        // If the screen has not a definition small enough to match the minimum number of pixels we want to display,
        // let's make the canvas the size of the screen (in real pixels)
        if (realPixelNumber <= this.minRecommendedGamePixelsNumber) {
            return {
                game: realPixelScreenSize,
                real: realPixelScreenSize,
            };
        }

        this._optimalZoomLevel = this.getOptimalZoomLevel(realPixelNumber);
        if (this._mapSize) {
            // Zoom out down to the default zoom, or further if needed to see the whole map, but not beyond.
            this._maxZoomOut = Math.min(
                this._optimalZoomLevel,
                realPixelScreenSize.width / this._mapSize.width,
                realPixelScreenSize.height / this._mapSize.height,
            );
        }

        // Has the canvas more pixels than the screen? This is forbidden
        if (this.isMaximumZoomReached) {
            // Let's reset the zoom modifier (WARNING this is a SIDE EFFECT in a getter)
            this._zoomModifier = this._maxZoomOut / this._optimalZoomLevel;

            const maxGameWidth = Math.ceil(realPixelScreenSize.width / this._optimalZoomLevel / this._zoomModifier);
            const maxGameHeight = Math.ceil(realPixelScreenSize.height / this._optimalZoomLevel / this._zoomModifier);
            return {
                game: {
                    width: maxGameWidth,
                    height: maxGameHeight,
                },
                real: realPixelScreenSize,
            };
        }

        const gameWidth = Math.ceil(realPixelScreenSize.width / this._optimalZoomLevel / this._zoomModifier);
        const gameHeight = Math.ceil(realPixelScreenSize.height / this._optimalZoomLevel / this._zoomModifier);

        // Let's ensure we display a minimum of pixels, even if crazily zoomed in.
        if (gameWidth * gameHeight < this.absoluteMinPixelNumber) {
            this._maxZoomInReached = true;
            const minGameHeight = Math.sqrt(
                (this.absoluteMinPixelNumber * realPixelScreenSize.height) / realPixelScreenSize.width,
            );
            const minGameWidth = Math.sqrt(
                (this.absoluteMinPixelNumber * realPixelScreenSize.width) / realPixelScreenSize.height,
            );

            // Let's reset the zoom modifier (WARNING this is a SIDE EFFECT in a getter)
            this._zoomModifier = realPixelScreenSize.width / minGameWidth / this._optimalZoomLevel;

            return {
                game: {
                    width: minGameWidth,
                    height: minGameHeight,
                },
                real: realPixelScreenSize,
            };
        }

        return {
            game: {
                width: gameWidth,
                height: gameHeight,
            },
            real: {
                width: Math.ceil(realPixelScreenSize.width / this._optimalZoomLevel) * this._optimalZoomLevel,
                height: Math.ceil(realPixelScreenSize.height / this._optimalZoomLevel) * this._optimalZoomLevel,
            },
        };
    }

    /**
     * We only accept integer but we make an exception for 1.5
     */
    public getOptimalZoomLevel(realPixelNumber: number): number {
        const result = Math.sqrt(realPixelNumber / this.minRecommendedGamePixelsNumber);
        if (1.5 <= result && result < 2) {
            return 1.5;
        } else {
            return Math.floor(result);
        }
    }

    public get zoomModifier(): number {
        return this._zoomModifier;
    }

    public set zoomModifier(zoomModifier: number) {
        this._zoomModifier = zoomModifier;
    }

    /** The map size in game pixels. Once set, it decides how far the user can zoom out (see getOptimalGameSize). */
    public set mapSize(mapSize: Size) {
        this._mapSize = mapSize;
    }

    public get maxZoomOut(): number {
        return this._maxZoomOut;
    }

    public get isMaximumZoomReached(): boolean {
        return this._optimalZoomLevel * this._zoomModifier <= this._maxZoomOut;
    }

    public get isMaximumZoomInReached(): boolean {
        return this._maxZoomInReached;
    }
}
