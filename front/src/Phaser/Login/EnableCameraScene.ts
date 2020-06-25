import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import {ClickButton} from "../Components/ClickButton";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {PLAYER_RESOURCES, PlayerResourceDescriptionInterface} from "../Entity/Character";
import {GameSceneInitInterface} from "../Game/GameScene";
import {StartMapInterface} from "../../Connection";
import {mediaManager, MediaManager} from "../../WebRtc/MediaManager";
import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import {SoundMeter} from "../Components/SoundMeter";
import {SoundMeterSprite} from "../Components/SoundMeterSprite";

export const EnableCameraSceneName = "EnableCameraScene";
enum LoginTextures {
    playButton = "play_button",
    icon = "icon",
    mainFont = "main_font",
    arrowRight = "arrow_right",
    arrowUp = "arrow_up"
}

export class EnableCameraScene extends Phaser.Scene {
    private textField: TextField;
    private pressReturnField: TextField;
    private cameraNameField: TextField;
    private logo: Image;
    private arrowLeft: Image;
    private arrowRight: Image;
    private arrowDown: Image;
    private arrowUp: Image;
    private microphonesList: MediaDeviceInfo[] = new Array<MediaDeviceInfo>();
    private camerasList: MediaDeviceInfo[] = new Array<MediaDeviceInfo>();
    private cameraSelected: number = 0;
    private microphoneSelected: number = 0;
    private soundMeter: SoundMeter;
    private soundMeterSprite: SoundMeterSprite;
    private microphoneNameField: TextField;
    private repositionCallback: (this: Window, ev: UIEvent) => void;

    constructor() {
        super({
            key: EnableCameraSceneName
        });
        this.soundMeter = new SoundMeter();
    }

    preload() {
        this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.icon, "resources/logos/tcm_full.png");
        this.load.image(LoginTextures.arrowRight, "resources/objects/arrow_right.png");
        this.load.image(LoginTextures.arrowUp, "resources/objects/arrow_up.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
    }

    create() {
        this.textField = new TextField(this, this.game.renderer.width / 2, 20, 'Turn on your camera and microphone');
        this.textField.setOrigin(0.5).setCenterAlign();

        this.pressReturnField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height - 30, 'Press enter to start');
        this.pressReturnField.setOrigin(0.5).setCenterAlign();

        this.cameraNameField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height - 60, '');
        this.cameraNameField.setOrigin(0.5).setCenterAlign();

        this.microphoneNameField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height - 40, '');
        this.microphoneNameField.setOrigin(0.5).setCenterAlign();

        this.arrowRight = new Image(this, 0, 0, LoginTextures.arrowRight);
        this.arrowRight.setOrigin(0.5, 0.5);
        this.arrowRight.setVisible(false);
        this.arrowRight.setInteractive().on('pointerdown', this.nextCam.bind(this));
        this.add.existing(this.arrowRight);

        this.arrowLeft = new Image(this, 0, 0, LoginTextures.arrowRight);
        this.arrowLeft.setOrigin(0.5, 0.5);
        this.arrowLeft.setVisible(false);
        this.arrowLeft.flipX = true;
        this.arrowLeft.setInteractive().on('pointerdown', this.previousCam.bind(this));
        this.add.existing(this.arrowLeft);

        this.arrowUp = new Image(this, 0, 0, LoginTextures.arrowUp);
        this.arrowUp.setOrigin(0.5, 0.5);
        this.arrowUp.setVisible(false);
        this.arrowUp.setInteractive().on('pointerdown', this.previousMic.bind(this));
        this.add.existing(this.arrowUp);

        this.arrowDown = new Image(this, 0, 0, LoginTextures.arrowUp);
        this.arrowDown.setOrigin(0.5, 0.5);
        this.arrowDown.setVisible(false);
        this.arrowDown.flipY = true;
        this.arrowDown.setInteractive().on('pointerdown', this.nextMic.bind(this));
        this.add.existing(this.arrowDown);

        this.logo = new Image(this, this.game.renderer.width - 30, this.game.renderer.height - 20, LoginTextures.icon);
        this.add.existing(this.logo);

        this.input.keyboard.on('keyup-ENTER', () => {
            return this.login();
        });

        this.getElementByIdOrFail<HTMLDivElement>('webRtcSetup').classList.add('active');

        const mediaPromise = mediaManager.getCamera();
        mediaPromise.then(this.getDevices.bind(this));
        mediaPromise.then(this.setupStream.bind(this));

        this.input.keyboard.on('keydown-RIGHT', this.nextCam.bind(this));
        this.input.keyboard.on('keydown-LEFT', this.previousCam.bind(this));
        this.input.keyboard.on('keydown-DOWN', this.nextMic.bind(this));
        this.input.keyboard.on('keydown-UP', this.previousMic.bind(this));

        this.soundMeterSprite = new SoundMeterSprite(this, 50, 50);
        this.soundMeterSprite.setVisible(false);
        this.add.existing(this.soundMeterSprite);

        this.repositionCallback = this.reposition.bind(this);
        window.addEventListener('resize', this.repositionCallback);
    }

    private previousCam(): void {
        if (this.cameraSelected === 0 || this.camerasList.length === 0) {
            return;
        }
        this.cameraSelected--;
        mediaManager.setCamera(this.camerasList[this.cameraSelected].deviceId).then(this.setupStream.bind(this));
    }

    private nextCam(): void {
        if (this.cameraSelected === this.camerasList.length - 1 || this.camerasList.length === 0) {
            return;
        }
        this.cameraSelected++;
        // TODO: the change of camera should be OBSERVED (reactive)
        mediaManager.setCamera(this.camerasList[this.cameraSelected].deviceId).then(this.setupStream.bind(this));
    }

    private previousMic(): void {
        if (this.microphoneSelected === 0 || this.microphonesList.length === 0) {
            return;
        }
        this.microphoneSelected--;
        mediaManager.setMicrophone(this.microphonesList[this.microphoneSelected].deviceId).then(this.setupStream.bind(this));
    }

    private nextMic(): void {
        if (this.microphoneSelected === this.microphonesList.length - 1 || this.microphonesList.length === 0) {
            return;
        }
        this.microphoneSelected++;
        // TODO: the change of camera should be OBSERVED (reactive)
        mediaManager.setMicrophone(this.microphonesList[this.microphoneSelected].deviceId).then(this.setupStream.bind(this));
    }

    /**
     * Function called each time a camera is changed
     */
    private setupStream(stream: MediaStream): void {
        const img = this.getElementByIdOrFail<HTMLDivElement>('webRtcSetupNoVideo');
        img.style.display = 'none';

        const div = this.getElementByIdOrFail<HTMLVideoElement>('myCamVideoSetup');
        div.srcObject = stream;

        this.soundMeter.connectToSource(stream, new window.AudioContext());
        this.soundMeterSprite.setVisible(true);

        this.updateWebCamName();
    }

    private updateWebCamName(): void {
        if (this.camerasList.length > 1) {
            const div = this.getElementByIdOrFail<HTMLVideoElement>('myCamVideoSetup');

            let label = this.camerasList[this.cameraSelected].label;
            // remove text in parenthesis
            label = label.replace(/\([^()]*\)/g, '').trim();
            // remove accents
            label = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            this.cameraNameField.text = label;

            if (this.cameraSelected < this.camerasList.length - 1) {
                this.arrowRight.setVisible(true);
            } else {
                this.arrowRight.setVisible(false);
            }

            if (this.cameraSelected > 0) {
                this.arrowLeft.setVisible(true);
            } else {
                this.arrowLeft.setVisible(false);
            }
        }
        if (this.microphonesList.length > 1) {
            let label = this.microphonesList[this.microphoneSelected].label;
            // remove text in parenthesis
            label = label.replace(/\([^()]*\)/g, '').trim();
            // remove accents
            label = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            this.microphoneNameField.text = label;

            if (this.microphoneSelected < this.microphonesList.length - 1) {
                this.arrowDown.setVisible(true);
            } else {
                this.arrowDown.setVisible(false);
            }

            if (this.microphoneSelected > 0) {
                this.arrowUp.setVisible(true);
            } else {
                this.arrowUp.setVisible(false);
            }

        }
        this.reposition();
    }

    private reposition(): void {
        let div = this.getElementByIdOrFail<HTMLVideoElement>('myCamVideoSetup');
        let bounds = div.getBoundingClientRect();
        if (!div.srcObject) {
            div = this.getElementByIdOrFail<HTMLVideoElement>('webRtcSetup');
            bounds = div.getBoundingClientRect();
        }

        this.textField.x = this.game.renderer.width / 2;
        this.cameraNameField.x = this.game.renderer.width / 2;
        this.microphoneNameField.x = this.game.renderer.width / 2;
        this.pressReturnField.x = this.game.renderer.width / 2;
        this.pressReturnField.x = this.game.renderer.width / 2;

        this.cameraNameField.y = bounds.top / RESOLUTION - 8;

        this.soundMeterSprite.x = this.game.renderer.width / 2 - this.soundMeterSprite.getWidth() / 2;
        this.soundMeterSprite.y = bounds.bottom / RESOLUTION + 16;

        this.microphoneNameField.y = this.soundMeterSprite.y + 22;

        this.arrowRight.x = bounds.right / RESOLUTION + 16;
        this.arrowRight.y = (bounds.top + bounds.height / 2) / RESOLUTION;

        this.arrowLeft.x = bounds.left / RESOLUTION - 16;
        this.arrowLeft.y = (bounds.top + bounds.height / 2) / RESOLUTION;

        this.arrowDown.x = this.microphoneNameField.x + this.microphoneNameField.width / 2 + 16;
        this.arrowDown.y = this.microphoneNameField.y;

        this.arrowUp.x = this.microphoneNameField.x - this.microphoneNameField.width / 2 - 16;
        this.arrowUp.y = this.microphoneNameField.y;

        this.pressReturnField.y = Math.max(this.game.renderer.height - 30, this.microphoneNameField.y + 20);
        this.logo.x = this.game.renderer.width - 30;
        this.logo.y = Math.max(this.game.renderer.height - 20, this.microphoneNameField.y + 30);
    }

    update(time: number, delta: number): void {
        this.pressReturnField.setVisible(!!(Math.floor(time / 500) % 2));

        this.soundMeterSprite.setVolume(this.soundMeter.getVolume());
    }

    private async login(): Promise<StartMapInterface> {
        this.getElementByIdOrFail<HTMLDivElement>('webRtcSetup').style.display = 'none';
        this.soundMeter.stop();
        window.removeEventListener('resize', this.repositionCallback);

        // Do we have a start URL in the address bar? If so, let's redirect to this address
        const instanceAndMapUrl = this.findMapUrl();
        if (instanceAndMapUrl !== null) {
            const [mapUrl, instance] = instanceAndMapUrl;
            const key = gameManager.loadMap(mapUrl, this.scene, instance);
            this.scene.start(key, {
                startLayerName: window.location.hash ? window.location.hash.substr(1) : undefined
            } as GameSceneInitInterface);
            return {
                mapUrlStart: mapUrl,
                startInstance: instance
            };
        } else {
            // If we do not have a map address in the URL, let's ask the server for a start map.
            return gameManager.loadStartMap().then((startMap: StartMapInterface) => {
                const key = gameManager.loadMap(window.location.protocol + "//" + startMap.mapUrlStart, this.scene, startMap.startInstance);
                this.scene.start(key);
                return startMap;
            }).catch((err) => {
                console.error(err);
                throw err;
            });
        }
    }

    /**
     * Returns the map URL and the instance from the current URL
     */
    private findMapUrl(): [string, string]|null {
        const path = window.location.pathname;
        if (!path.startsWith('/_/')) {
            return null;
        }
        const instanceAndMap = path.substr(3);
        const firstSlash = instanceAndMap.indexOf('/');
        if (firstSlash === -1) {
            return null;
        }
        const instance = instanceAndMap.substr(0, firstSlash);
        return [window.location.protocol+'//'+instanceAndMap.substr(firstSlash+1), instance];
    }

    private async getDevices() {
        const mediaDeviceInfos = await navigator.mediaDevices.enumerateDevices();
        for (const mediaDeviceInfo of mediaDeviceInfos) {
            if (mediaDeviceInfo.kind === 'audioinput') {
                this.microphonesList.push(mediaDeviceInfo);
            } else if (mediaDeviceInfo.kind === 'videoinput') {
                this.camerasList.push(mediaDeviceInfo);
            }
        }
        this.updateWebCamName();
    }

    private getElementByIdOrFail<T extends HTMLElement>(id: string): T {
        const elem = document.getElementById(id);
        if (elem === null) {
            throw new Error("Cannot find HTML element with id '"+id+"'");
        }
        // FIXME: does not check the type of the returned type
        return elem as T;
    }
}
