const LogoNameIndex: string = 'logo';
const LogoResource: string = 'resources/logos/logo.png';

export const addLoader = (scene: Phaser.Scene): void => {
    const loaderPlugin = scene.load.image(LogoNameIndex, LogoResource);
    loaderPlugin.spritesheet(LogoNameIndex, LogoResource);
    const promiseLoadLogoTexture = new Promise<Phaser.GameObjects.Image>((res) => {
        if (loaderPlugin.textureManager.exists(LogoNameIndex)) {
            return res(scene.add.image(scene.game.renderer.width / 2, 100, LogoNameIndex));
        }
        loaderPlugin.once(`filecomplete-spritesheet-${LogoNameIndex}`, () => {
            res(scene.add.image(scene.game.renderer.width / 2, 100, LogoNameIndex))
        });
    });

    const progress = scene.add.graphics();
    scene.load.on('progress', (value: number) => {
        progress.clear();
        progress.fillStyle(0xffffff, 1);
        progress.fillRect(0, 270, 800 * value, 60);
    });
    scene.load.on('complete', () => {
        promiseLoadLogoTexture.then((resLoadingImage: Phaser.GameObjects.Image) => {
            resLoadingImage.destroy();
        });
        progress.destroy();
    });
}