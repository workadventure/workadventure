import ImageFrameConfig = Phaser.Types.Loader.FileTypes.ImageFrameConfig;

const LogoNameIndex: string = 'logoLoading';
const TextName: string = 'Loading...';
const LogoResource: string = 'resources/logos/logo.png';
const LogoFrame: ImageFrameConfig = {frameWidth: 307, frameHeight: 59};

export const addLoader = (scene: Phaser.Scene): void => {
    let loadingText: Phaser.GameObjects.Text|null = null;

    const promiseLoadLogoTexture = new Promise<Phaser.GameObjects.Image>((res) => {
        if(scene.load.textureManager.exists(LogoNameIndex)){
            return res(scene.add.image(scene.game.renderer.width / 2, 100, LogoNameIndex));
        }else{
            //add loading if logo image is not ready
            loadingText = scene.add.text(scene.game.renderer.width / 2, 200, TextName);
        }
        scene.load.spritesheet(LogoNameIndex, LogoResource, LogoFrame);
        scene.load.once(`filecomplete-spritesheet-${LogoNameIndex}`, () => {
            if(loadingText){
                loadingText.destroy();
            }
            return res(scene.add.image(scene.game.renderer.width / 2, 100, LogoNameIndex));
        });
    });

    const progress = scene.add.graphics();
    scene.load.on('progress', (value: number) => {
        progress.clear();
        progress.fillStyle(0xffffff, 1);
        progress.fillRect(0, 270, 800 * value, 60);
    });
    scene.load.on('complete', () => {
        if(loadingText){
            loadingText.destroy();
        }
        promiseLoadLogoTexture.then((resLoadingImage: Phaser.GameObjects.Image) => {
            resLoadingImage.destroy();
        });
        progress.destroy();
    });
}