
export const addLoader = (scene:Phaser.Scene): void => {
    const loadingText = scene.add.text(scene.game.renderer.width / 2, 200, 'Loading');
    const progress = scene.add.graphics();
    scene.load.on('progress', (value: number) => {
        progress.clear();
        progress.fillStyle(0xffffff, 1);
        progress.fillRect(0, 270, 800 * value, 60);
    });
    scene.load.on('complete', () => {
        loadingText.destroy();
        progress.destroy();
    });
}