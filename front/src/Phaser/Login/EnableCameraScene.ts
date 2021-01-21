import {gameManager} from "../Game/GameManager";
import {TextField} from "../Components/TextField";
import Image = Phaser.GameObjects.Image;
import Rectangle = Phaser.GameObjects.Rectangle;
import {GameSceneInitInterface} from "../Game/GameScene";
import {StartMapInterface} from "../../Connexion/ConnexionModels";
import {mediaManager} from "../../WebRtc/MediaManager";
import {RESOLUTION} from "../../Enum/EnvironmentVariable";
import {SoundMeter} from "../Components/SoundMeter";
import {SoundMeterSprite} from "../Components/SoundMeterSprite";
import {HtmlUtils} from "../../WebRtc/HtmlUtils";

export const EnableCameraSceneName = "EnableCameraScene";
enum LoginTextures {
    playButton = "play_button",
    icon = "icon",
    mainFont = "main_font",
    arrowRight = "arrow_right",
    arrowUp = "arrow_up"
}

export class EnableCameraScene extends Phaser.Scene {
    private textField!: TextField;
    private pressReturnField!: TextField;
    private cameraNameField!: TextField;
    private logo!: Image;
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

    private mobileTapRectangle!: Rectangle;
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

        this.pressReturnField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height - 30, 'Touch here\n\n or \n\nPress enter to start');
        // For mobile purposes - we need a big enough touchable area.
        this.mobileTapRectangle = this.add
          .rectangle(
            this.game.renderer.width / 2,
            this.game.renderer.height - 30,
            200,
            50,
          )
          .setInteractive()
          .on("pointerdown", () => {
            this.login();
          });

        this.cameraNameField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height - 60, '');

        this.microphoneNameField = new TextField(this, this.game.renderer.width / 2, this.game.renderer.height - 40, '');

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
            const div = HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('myCamVideoSetup');

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
        let div = HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('myCamVideoSetup');
        let bounds = div.getBoundingClientRect();
        if (!div.srcObject) {
            div = HtmlUtils.getElementByIdOrFail<HTMLVideoElement>('webRtcSetup');
            bounds = div.getBoundingClientRect();
        }

        this.textField.x = this.game.renderer.width / 2;
        this.mobileTapRectangle.x = this.game.renderer.width / 2;
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

        mediaManager.setLastUpdateScene();
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
}
