import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import {mediaManager} from "../../WebRtc/MediaManager";
import {SoundMeter} from "../Components/SoundMeter";
import {SoundMeterSprite} from "../Components/SoundMeterSprite";
import {HtmlUtils} from "../../WebRtc/HtmlUtils";
import {touchScreenManager} from "../../Touch/TouchScreenManager";
import {PinchManager} from "../UserInput/PinchManager";
import Zone = Phaser.GameObjects.Zone;
import { MenuScene } from "../Menu/MenuScene";
import {ResizableScene} from "./ResizableScene";
import {
    audioConstraintStore,
    localStreamStore,
    enableCameraSceneVisibilityStore,
    mediaStreamConstraintsStore,
    videoConstraintStore
} from "../../Stores/MediaStore";
import type {Unsubscriber} from "svelte/store";

export const EnableCameraSceneName = "EnableCameraScene";
enum LoginTextures {
    playButton = "play_button",
    icon = "icon",
    mainFont = "main_font",
    arrowRight = "arrow_right",
    arrowUp = "arrow_up"
}

export class EnableCameraScene extends ResizableScene {
    private textField!: TextField;
    private cameraNameField!: TextField;
    private arrowLeft!: Image;
    private arrowRight!: Image;
    private arrowDown!: Image;
    private arrowUp!: Image;
    private microphonesList: MediaDeviceInfo[] = new Array<MediaDeviceInfo>();
    private camerasList: MediaDeviceInfo[] = new Array<MediaDeviceInfo>();
    private cameraSelected: number = 0;
    private microphoneSelected: number = 0;
    private soundMeter: SoundMeter;
    private soundMeterSprite!: SoundMeterSprite;
    private microphoneNameField!: TextField;

    private mobileTapZone!: Zone;
    private localStreamStoreUnsubscriber!: Unsubscriber;

    constructor() {
        super({
            key: EnableCameraSceneName
        });
        this.soundMeter = new SoundMeter();
    }

    preload() {
        this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.arrowRight, "resources/objects/arrow_right.png");
        this.load.image(LoginTextures.arrowUp, "resources/objects/arrow_up.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
    }

    create() {
        if (touchScreenManager.supportTouchScreen) {
            new PinchManager(this);
        }
        //this.scale.setZoom(ZOOM_LEVEL);
        //Phaser.Display.Align.In.BottomCenter(this.pressReturnField, zone);

        /* FIX ME */
        this.textField = new TextField(this, this.scale.width / 2, 20, '');

        // For mobile purposes - we need a big enough touchable area.
        this.mobileTapZone = this.add.zone(this.scale.width / 2,this.scale.height - 30,200,50)
          .setInteractive().on("pointerdown", () => {
            this.login();
          });

        this.cameraNameField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height - 60, '');

        this.microphoneNameField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height - 40, '');

        this.arrowRight = new Image(this, 0, 0, LoginTextures.arrowRight);
        this.arrowRight.setVisible(false);
        this.arrowRight.setInteractive().on('pointerdown', this.nextCam.bind(this));
        this.add.existing(this.arrowRight);

        this.arrowLeft = new Image(this, 0, 0, LoginTextures.arrowRight);
        this.arrowLeft.setVisible(false);
        this.arrowLeft.flipX = true;
        this.arrowLeft.setInteractive().on('pointerdown', this.previousCam.bind(this));
        this.add.existing(this.arrowLeft);

        this.arrowUp = new Image(this, 0, 0, LoginTextures.arrowUp);
        this.arrowUp.setVisible(false);
        this.arrowUp.setInteractive().on('pointerdown', this.previousMic.bind(this));
        this.add.existing(this.arrowUp);

        this.arrowDown = new Image(this, 0, 0, LoginTextures.arrowUp);
        this.arrowDown.setVisible(false);
        this.arrowDown.flipY = true;
        this.arrowDown.setInteractive().on('pointerdown', this.nextMic.bind(this));
        this.add.existing(this.arrowDown);

        this.input.keyboard.on('keyup-ENTER', () => {
            this.login();
        });

        this.localStreamStoreUnsubscriber = localStreamStore.subscribe((result) => {
            if (result.type === 'error') {
                // TODO: we could handle the error in a specific way on the EnableCameraScene page.
                // TODO: we could handle the error in a specific way on the EnableCameraScene page.
                return;
                //throw result.error;
            }

            this.getDevices();
            if (result.stream !== null) {
                this.setupStream(result.stream);
            }
        });
        /*const mediaPromise = mediaManager.getCamera();
        mediaPromise.then(this.getDevices.bind(this));
        mediaPromise.then(this.setupStream.bind(this));*/

        this.input.keyboard.on('keydown-RIGHT', this.nextCam.bind(this));
        this.input.keyboard.on('keydown-LEFT', this.previousCam.bind(this));
        this.input.keyboard.on('keydown-DOWN', this.nextMic.bind(this));
        this.input.keyboard.on('keydown-UP', this.previousMic.bind(this));

        this.soundMeterSprite = new SoundMeterSprite(this, 50, 50);
        this.soundMeterSprite.setVisible(false);
        this.add.existing(this.soundMeterSprite);

        enableCameraSceneVisibilityStore.showEnableCameraScene();

        setTimeout(() => {
            this.onResize();
        }, 100);

    }

    private previousCam(): void {
        if (this.cameraSelected === 0 || this.camerasList.length === 0) {
            return;
        }
        this.cameraSelected--;
        videoConstraintStore.setDeviceId(this.camerasList[this.cameraSelected].deviceId);

        //mediaManager.setCamera(this.camerasList[this.cameraSelected].deviceId).then(this.setupStream.bind(this));
    }

    private nextCam(): void {
        if (this.cameraSelected === this.camerasList.length - 1 || this.camerasList.length === 0) {
            return;
        }
        this.cameraSelected++;
        videoConstraintStore.setDeviceId(this.camerasList[this.cameraSelected].deviceId);

        // TODO: the change of camera should be OBSERVED (reactive)
        //mediaManager.setCamera(this.camerasList[this.cameraSelected].deviceId).then(this.setupStream.bind(this));
    }

    private previousMic(): void {
        if (this.microphoneSelected === 0 || this.microphonesList.length === 0) {
            return;
        }
        this.microphoneSelected--;
        audioConstraintStore.setDeviceId(this.microphonesList[this.microphoneSelected].deviceId);
        //mediaManager.setMicrophone(this.microphonesList[this.microphoneSelected].deviceId).then(this.setupStream.bind(this));
    }

    private nextMic(): void {
        if (this.microphoneSelected === this.microphonesList.length - 1 || this.microphonesList.length === 0) {
            return;
        }
        this.microphoneSelected++;
        audioConstraintStore.setDeviceId(this.microphonesList[this.microphoneSelected].deviceId);
        // TODO: the change of camera should be OBSERVED (reactive)
        //mediaManager.setMicrophone(this.microphonesList[this.microphoneSelected].deviceId).then(this.setupStream.bind(this));
    }

    /**
     * Function called each time a camera is changed
     */
    private setupStream(stream: MediaStream): void {
        this.soundMeter.connectToSource(stream, new window.AudioContext());
        this.soundMeterSprite.setVisible(true);

        this.updateWebCamName();
    }

    private updateWebCamName(): void {
        if (this.camerasList.length > 1) {
            let label = this.camerasList[this.cameraSelected].label;
            // remove text in parenthesis
            label = label.replace(/\([^()]*\)/g, '').trim();
            // remove accents
            label = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            this.cameraNameField.text = label;

            this.arrowRight.setVisible(this.cameraSelected < this.camerasList.length - 1);
            this.arrowLeft.setVisible(this.cameraSelected > 0);
        }
        if (this.microphonesList.length > 1) {
            let label = this.microphonesList[this.microphoneSelected].label;
            // remove text in parenthesis
            label = label.replace(/\([^()]*\)/g, '').trim();
            // remove accents
            label = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            this.microphoneNameField.text = label;

            this.arrowDown.setVisible(this.microphoneSelected < this.microphonesList.length - 1);
            this.arrowUp.setVisible(this.microphoneSelected > 0);

        }
    }

    public onResize(): void {
        let div = HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('myCamVideoSetup');
        let bounds = div.getBoundingClientRect();
        if (!div.srcObject) {
            div = HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('webRtcSetup');
            bounds = div.getBoundingClientRect();
        }

        this.textField.x = this.game.renderer.width / 2;
        this.mobileTapZone.x = this.game.renderer.width / 2;
        this.cameraNameField.x = this.game.renderer.width / 2;
        this.microphoneNameField.x = this.game.renderer.width / 2;

        this.cameraNameField.y = bounds.top / this.scale.zoom - 8;

        this.soundMeterSprite.x = this.game.renderer.width / 2 - this.soundMeterSprite.getWidth() / 2;
        this.soundMeterSprite.y = bounds.bottom / this.scale.zoom + 16;

        this.microphoneNameField.y = this.soundMeterSprite.y + 22;

        this.arrowRight.x = bounds.right / this.scale.zoom + 16;
        this.arrowRight.y = (bounds.top + bounds.height / 2) / this.scale.zoom;

        this.arrowLeft.x = bounds.left / this.scale.zoom - 16;
        this.arrowLeft.y = (bounds.top + bounds.height / 2) / this.scale.zoom;

        this.arrowDown.x = this.microphoneNameField.x + this.microphoneNameField.width / 2 + 16;
        this.arrowDown.y = this.microphoneNameField.y;

        this.arrowUp.x = this.microphoneNameField.x - this.microphoneNameField.width / 2 - 16;
        this.arrowUp.y = this.microphoneNameField.y;

        /*const actionBtn = document.querySelector<HTMLDivElement>('#enableCameraScene .action');
        if (actionBtn !== null) {
            actionBtn.style.top = (this.scale.height - 65) + 'px';
        }*/
    }

    update(time: number, delta: number): void {
        this.soundMeterSprite.setVolume(this.soundMeter.getVolume());
    }

    public login(): void {
        HtmlUtils.getElementByIdOrFail<HTMLDivElement>('webRtcSetup').style.display = 'none';
        this.soundMeter.stop();

        enableCameraSceneVisibilityStore.hideEnableCameraScene();
        this.localStreamStoreUnsubscriber();
        //mediaManager.stopCamera();
        //mediaManager.stopMicrophone();

        this.scene.sleep(EnableCameraSceneName);
        gameManager.goToStartingMap(this.scene);
    }

    private async getDevices() {
        // TODO: switch this in a store.
        const mediaDeviceInfos = await navigator.mediaDevices.enumerateDevices();
        this.microphonesList = [];
        this.camerasList = [];
        for (const mediaDeviceInfo of mediaDeviceInfos) {
            if (mediaDeviceInfo.kind === 'audioinput') {
                this.microphonesList.push(mediaDeviceInfo);
            } else if (mediaDeviceInfo.kind === 'videoinput') {
                this.camerasList.push(mediaDeviceInfo);
            }
        }
        this.updateWebCamName();
    }
}
