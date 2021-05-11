import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {mediaManager} from "../../WebRtc/MediaManager";
import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import {SoundMeter} from "../Components/SoundMeter";
import {SoundMeterSprite} from "../Components/SoundMeterSprite";
import {HtmlUtils} from "../../WebRtc/HtmlUtils";
import {touchScreenManager} from "../../Touch/TouchScreenManager";
import {PinchManager} from "../UserInput/PinchManager";
import Zone = Phaser.GameObjects.Zone;
import { MenuScene } from "../Menu/MenuScene";

export const EnableCameraSceneName = "EnableCameraScene";
enum LoginTextures {
    playButton = "play_button",
    icon = "icon",
    mainFont = "main_font",
    arrowRight = "arrow_right",
    arrowUp = "arrow_up"
}

const enableCameraSceneKey = 'enableCameraScene';

export class EnableCameraScene extends Phaser.Scene {
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
    private repositionCallback!: (this: Window, ev: UIEvent) => void;

    private enableCameraSceneElement!: Phaser.GameObjects.DOMElement;

    private mobileTapZone!: Zone;
    constructor() {
        super({
            key: EnableCameraSceneName
        });
        this.soundMeter = new SoundMeter();
    }

    preload() {

        this.load.html(enableCameraSceneKey, 'resources/html/EnableCameraScene.html');

        this.load.image(LoginTextures.playButton, "resources/objects/play_button.png");
        this.load.image(LoginTextures.arrowRight, "resources/objects/arrow_right.png");
        this.load.image(LoginTextures.arrowUp, "resources/objects/arrow_up.png");
        // Note: arcade.png from the Phaser 3 examples at: https://github.com/photonstorm/phaser3-examples/tree/master/public/assets/fonts/bitmap
        this.load.bitmapFont(LoginTextures.mainFont, 'resources/fonts/arcade.png', 'resources/fonts/arcade.xml');
    }

    create() {

        const middleX = this.getMiddleX();
        this.enableCameraSceneElement = this.add.dom(middleX, 0).createFromCache(enableCameraSceneKey);
        MenuScene.revealMenusAfterInit(this.enableCameraSceneElement, enableCameraSceneKey);

        const continuingButton = this.enableCameraSceneElement.getChildByID('enableCameraSceneFormSubmit') as HTMLButtonElement;
        continuingButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.login();
        });

        if (touchScreenManager.supportTouchScreen) {
            new PinchManager(this);
        }
        
        /* FIX ME */
        this.textField = new TextField(this, this.game.renderer.width / 2, 20, '');

        // For mobile purposes - we need a big enough touchable area.
        this.mobileTapZone = this.add.zone(this.game.renderer.width / 2,this.game.renderer.height - 30,200,50)
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

        HtmlUtils.getElementByIdOrFail<HTMLDivElement>('webRtcSetup').classList.add('active');

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
        const img = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('webRtcSetupNoVideo');
        img.style.display = 'none';

        const div = HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('myCamVideoSetup');
        div.srcObject = stream;

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
        this.reposition();
    }

    private reposition(): void {
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
    }

    update(time: number, delta: number): void {
        this.soundMeterSprite.setVolume(this.soundMeter.getVolume());

        const middleX = this.getMiddleX();
        this.tweens.add({
            targets: this.enableCameraSceneElement,
            x: middleX,
            duration: 1000,
            ease: 'Power3'
        });
    }

    private login(): void {
        HtmlUtils.getElementByIdOrFail<HTMLDivElement>('webRtcSetup').style.display = 'none';
        this.soundMeter.stop();
        window.removeEventListener('resize', this.repositionCallback);

        mediaManager.stopCamera();
        mediaManager.stopMicrophone();

        this.scene.sleep(EnableCameraSceneName)
        gameManager.goToStartingMap(this.scene);
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

    private getMiddleX() : number{
        return (this.game.renderer.width / RESOLUTION) -
        (
            this.enableCameraSceneElement
            && this.enableCameraSceneElement.node
            && this.enableCameraSceneElement.node.getBoundingClientRect().width > 0
            ? (this.enableCameraSceneElement.node.getBoundingClientRect().width / (2*RESOLUTION))
            : (300 / RESOLUTION)
        );
    }
}
