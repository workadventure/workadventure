(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["AnimatedTiles"] = factory();
	else
		root["AnimatedTiles"] = factory();
})(window, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/*!*****************!*\
  !*** ./main.js ***!
  \*****************/
/*! no static exports found */
/*! all exports used */
/*! ModuleConcatenation bailout: Module is not an ECMAScript module */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @author       Niklas Berg <nkholski@niklasberg.se>
 * @copyright    2018 Niklas Berg
 * @license      {@link https://github.com/nkholski/phaser3-animated-tiles/blob/master/LICENSE|MIT License}
 */

//
// This plugin is based on Photonstorms Phaser 3 plugin template with added support for ES6.
//

var AnimatedTiles = function (_Phaser$Plugins$Scene) {
    _inherits(AnimatedTiles, _Phaser$Plugins$Scene);

    /*
     TODO:
    1. Fix property names which is a mess after adding support for multiple maps, tilesets and layers.
    2. Helper functions: Get mapIndex by passing a map (and maybe support it as argument to methods), Get layerIndex, get tile index from properties.

    */
    function AnimatedTiles(scene, pluginManager) {
        _classCallCheck(this, AnimatedTiles);

        // TileMap the plugin belong to.
        // TODO: Array or object for multiple tilemaps support
        // TODO: reference to layers too, and which is activated or not
        var _this = _possibleConstructorReturn(this, (AnimatedTiles.__proto__ || Object.getPrototypeOf(AnimatedTiles)).call(this, scene, pluginManager));

        _this.map = null;

        // Array with all tiles to animate
        // TODO: Turn on and off certain tiles.
        _this.animatedTiles = [];

        // Global playback rate
        _this.rate = 1;

        // Should the animations play or not?
        _this.active = false;

        // Should the animations play or not per layer. If global active is false this value makes no difference
        _this.activeLayer = [];

        // Obey timescale?
        _this.followTimeScale = true;

        if (!scene.sys.settings.isBooted) {
            scene.sys.events.once('boot', _this.boot, _this);
        }
        return _this;
    }

    //  Called when the Plugin is booted by the PluginManager.
    //  If you need to reference other systems in the Scene (like the Loader or DisplayList) then set-up those references now, not in the constructor.


    _createClass(AnimatedTiles, [{
        key: 'boot',
        value: function boot() {
            var eventEmitter = this.systems.events;
            eventEmitter.on('postupdate', this.postUpdate, this);
            eventEmitter.on('shutdown', this.shutdown, this);
            eventEmitter.on('destroy', this.destroy, this);
        }

        // Initilize support for animated tiles on given map

    }, {
        key: 'init',
        value: function init(map) {
            // TODO: Check if map is initilized already, if so do it again but overwrite the old.
            var mapAnimData = this.getAnimatedTiles(map);
            var animatedTiles = {
                map: map,
                animatedTiles: mapAnimData,
                active: true,
                rate: 1,
                activeLayer: []
            };
            map.layers.forEach(function () {
                return animatedTiles.activeLayer.push(true);
            });
            this.animatedTiles.push(animatedTiles);
            if (this.animatedTiles.length === 1) {
                this.active = true; // Start the animations by default
            }
            // Needed?
            this.animatedTiles[this.animatedTiles.length-1].animatedTiles.forEach(
                (animatedTile) => {
                    animatedTile.tiles.forEach((layer) => {
                        this.updateLayer(animatedTile,  layer);
                    });
                }
            )
        }
    }, {
        key: 'setRate',
        value: function setRate(rate) {
            var gid = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
            var map = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

            if (gid === null) {
                if (map === null) {
                    this.rate = rate;
                } else {
                    this.animatedTiles[map].rate = rate;
                }
            } else {
                var loopThrough = function loopThrough(animatedTiles) {
                    animatedTiles.forEach(function (animatedTile) {
                        if (animatedTile.index === gid) {
                            animatedTile.rate = rate;
                        }
                    });
                };
                if (map === null) {
                    this.animatedTiles.forEach(function (animatedTiles) {
                        loopThrough(animatedTiles.animatedTiles);
                    });
                } else {
                    loopThrough(this.animatedTiles[map].animatedTiles);
                }
            }
            // if tile is number (gid) --> set rate for that tile
            // TODO: if passing an object -> check properties matching object and set rate
        }
    }, {
        key: 'resetRates',
        value: function resetRates() {
            var mapIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

            if (mapIndex === null) {
                this.rate = 1;
                this.animatedTiles.forEach(function (mapAnimData) {
                    mapAnimData.rate = 1;
                    mapAnimData.animatedTiles.forEach(function (tileAnimData) {
                        tileAnimData.rate = 1;
                    });
                });
            } else {
                this.animatedTiles[mapIndex].rate = 1;
                this.animatedTiles[mapIndex].animatedTiles.forEach(function (tileAnimData) {
                    tileAnimData.rate = 1;
                });
            }
        }

        //  Start (or resume) animations
    }, {
        key: 'resume',
        value: function resume() {
            var _this2 = this;

            var layerIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
            var mapIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            var scope = mapIndex === null ? this : this.animatedTiles[mapIndex];
            if (layerIndex === null) {
                scope.active = true;
            } else {
                scope.activeLayer[layerIndex] = true;
                scope.animatedTiles.forEach(function (animatedTile) {
                    _this2.updateLayer(animatedTile, animatedTile.tiles[layerIndex]);
                });
            }
        }

        // Stop (or pause) animations

    }, {
        key: 'pause',
        value: function pause() {
            var layerIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
            var mapIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            var scope = mapIndex === null ? this : this.animatedTiles[mapIndex];
            if (layerIndex === null) {
                scope.active = false;
            } else {
                scope.activeLayer[layerIndex] = false;
            }
        }
    }, {
        key: 'postUpdate',
        value: function postUpdate(time, delta) {
            var _this3 = this;

            if (!this.active) {
                return;
            }
            // Elapsed time is the delta multiplied by the global rate and the scene timeScale if folowTimeScale is true
            var globalElapsedTime = delta * this.rate * (this.followTimeScale ? this.scene.time.timeScale : 1);
            this.animatedTiles.forEach(function (mapAnimData) {
                if (!mapAnimData.active) {
                    return;
                }
                // Multiply with rate for this map
                var elapsedTime = globalElapsedTime * mapAnimData.rate;
                mapAnimData.animatedTiles.forEach(function (animatedTile) {
                    // Reduce time for current tile, multiply elapsedTime with this tile's private rate
                    animatedTile.next -= elapsedTime * animatedTile.rate;
                    // Time for current tile is up!!!
                    if (animatedTile.next < 0) {
                        // Remember current frame index
                        var currentIndex = animatedTile.currentFrame;
                        // Remember the tileId of current tile
                        var oldTileId = animatedTile.frames[currentIndex].tileid;
                        // Advance to next in line
                        var newIndex = currentIndex + 1;
                        // If we went beyond last frame, we just start over
                        if (newIndex > animatedTile.frames.length - 1) {
                            newIndex = 0;
                        }
                        // Set lifelength for current frame
                        animatedTile.next = animatedTile.frames[newIndex].duration;
                        // Set index of current frame
                        animatedTile.currentFrame = newIndex;
                        // Store the tileId (gid) we will shift to
                        // Loop through all tiles (via layers)
                        //this.updateLayer
                        animatedTile.tiles.forEach(function (layer, layerIndex) {
                            if (!mapAnimData.activeLayer[layerIndex]) {
                                return;
                            }
                            _this3.updateLayer(animatedTile, layer, oldTileId);
                        });
                    }
                }); // animData loop
            }); // Map loop
        }
    }, {
        key: 'updateLayer',
        value: function updateLayer(animatedTile, layer) {
            var oldTileId = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : -1;

            var tilesToRemove = [];
            var tileId = animatedTile.frames[animatedTile.currentFrame].tileid;
            layer.forEach(function (tile) {
                // If the tile is removed or has another index than expected, it's
                // no longer animated. Mark for removal.
                if (oldTileId > -1 && (tile === null || tile.index !== oldTileId)) {
                    tilesToRemove.push(tile);
                } else {
                    // Finally we set the index of the tile to the one specified by current frame!!!
                    tile.index = tileId;
                }
            });
            // Remove obselete tiles
            tilesToRemove.forEach(function (tile) {
                var pos = layer.indexOf(tile);
                if (pos > -1) {
                    layer.splice(pos, 1);
                } else {
                    console.error("This shouldn't happen. Not at all. Blame Phaser Animated Tiles plugin. You'll be fine though.");
                }
            });
        }

        //  Called when a Scene shuts down, it may then come back again later (which will invoke the 'start' event) but should be considered dormant.

    }, {
        key: 'shutdown',
        value: function shutdown() {}

        //  Called when a Scene is destroyed by the Scene Manager. There is no coming back from a destroyed Scene, so clear up all resources here.

    }, {
        key: 'destroy',
        value: function destroy() {
            this.shutdown();
            this.scene = undefined;
        }
    }, {
        key: 'getAnimatedTiles',
        value: function getAnimatedTiles(map) {
            var _this4 = this;

            // this.animatedTiles is an array of objects with information on how to animate and which tiles.
            var animatedTiles = [];
            // loop through all tilesets
            map.tilesets.forEach(
            // Go through the data stored on each tile (not tile on the tilemap but tile in the tileset)
            function (tileset) {
                var tileData = tileset.tileData;
                Object.keys(tileData).forEach(function (index) {
                    index = parseInt(index);
                    // If tile has animation info we'll dive into it
                    if (tileData[index].hasOwnProperty("animation")) {
                        var animatedTileData = {
                            index: index + tileset.firstgid, // gid of the original tile
                            frames: [], // array of frames
                            currentFrame: 0, // start on first frame
                            tiles: [], // array with one array per layer with list of tiles that depends on this animation data
                            rate: 1 // multiplier, set to 2 for double speed or 0.25 quarter speed
                        };
                        // push all frames to the animatedTileData
                        tileData[index].animation.forEach(function (frameData) {
                            var frame = {
                                duration: frameData.duration,
                                tileid: frameData.tileid + tileset.firstgid
                            };
                            animatedTileData.frames.push(frame);
                        });
                        // time until jumping to next frame
                        animatedTileData.next = animatedTileData.frames[0].duration;
                        // Go through all layers for tiles
                        map.layers.forEach(function (layer) {
                            if ((!layer.tilemapLayer) ||
                                (!layer.tilemapLayer.type) ||
                                (layer.tilemapLayer.type === "StaticTilemapLayer")) {
                                // We just push an empty array if the layer is static (impossible to animate).
                                // If we just skip the layer, the layer order will be messed up
                                // when updating animated tiles and things will look awful.
                                animatedTileData.tiles.push([]);
                                return;
                            }
                            // tiles array for current layer
                            var tiles = [];
                            // loop through all rows with tiles...
                            layer.data.forEach(function (tileRow) {
                                // ...and loop through all tiles in that row
                                tileRow.forEach(function (tile) {
                                    // Tiled start index for tiles with 1 but animation with 0. Thus that wierd "-1"
                                    if (tile.index - tileset.firstgid === index) {
                                        tiles.push(tile);
                                    }
                                });
                            });
                            // add the layer's array with tiles to the tiles array.
                            // this will make it possible to control layers individually in the future
                            animatedTileData.tiles.push(tiles);
                        });
                        // animatedTileData is finished for current animation, push it to the animatedTiles-property of the plugin
                        animatedTiles.push(animatedTileData);
                    }
                });
            });
            map.layers.forEach(function (layer, layerIndex) {
                // layer indices array of booleans whether to animate tiles on layer or not
                _this4.activeLayer[layerIndex] = true;
            });

            return animatedTiles;
        }
    }, {
        key: 'putTileAt',
        value: function putTileAt(layer, tile, x, y) {
            // Replaces putTileAt of the native API, but updates the list of animatedTiles in the process.
            // No need to call updateAnimatedTiles as required for other modificatons of the tile-map
        }
    }, {
        key: 'updateAnimatedTiles',
        value: function updateAnimatedTiles() {
            // future args: x=null, y=null, w=null, h=null, container=null
            var x = null,
                y = null,
                w = null,
                h = null,
                container = null;
            // 1. If no container, loop through all initilized maps
            if (container === null) {
                container = [];
                this.animatedTiles.forEach(function (mapAnimData) {
                    container.push(mapAnimData);
                });
            }
            // 2. If container is a map, loop through it's layers
            // container = [container];

            // 1 & 2: Update the map(s)
            container.forEach(function (mapAnimData) {
                var chkX = x !== null ? x : 0;
                var chkY = y !== null ? y : 0;
                var chkW = w !== null ? mapAnimData.map.width : 10;
                var chkH = h !== null ? mapAnimData.map.height : 10;

                mapAnimData.animatedTiles.forEach(function (tileAnimData) {
                    tileAnimData.tiles.forEach(function (tiles, layerIndex) {
                        var layer = mapAnimData.map.layers[layerIndex];
                        if (layer.type === "StaticTilemapLayer") {
                            return;
                        }
                        for (var _x9 = chkX; _x9 < chkX + chkW; _x9++) {
                            for (var _y = chkY; _y < chkY + chkH; _y++) {
                                var tile = mapAnimData.map.layers[layerIndex].data[_x9][_y];
                                // should this tile be animated?
                                if (tile.index == tileAnimData.index) {
                                    // is it already known? if not, add it to the list
                                    if (tiles.indexOf(tile) === -1) {
                                        tiles.push(tile);
                                    }
                                    // update index to match current fram of this animation
                                    tile.index = tileAnimData.frames[tileAnimData.currentFrame].tileid;
                                }
                            }
                        }
                    });
                });
            });
            // 3. If container is a layer, just loop through it's tiles
        }
    }]);

    return AnimatedTiles;
}(Phaser.Plugins.ScenePlugin);

;

//  Static function called by the PluginFile Loader.
AnimatedTiles.register = function (PluginManager) {
    //  Register this plugin with the PluginManager, so it can be added to Scenes.
    PluginManager.register('AnimatedTiles', AnimatedTiles, 'animatedTiles');
};

module.exports = AnimatedTiles;

/***/ })
/******/ ]);
});
