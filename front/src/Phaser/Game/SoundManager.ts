import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import BaseSoundManager = Phaser.Sound.BaseSoundManager;
import BaseSound = Phaser.Sound.BaseSound;
import Config = Phaser.Core.Config;
import SoundConfig = Phaser.Types.Sound.SoundConfig;


class SoundManager {

    public  loadSound (loadPlugin: LoaderPlugin, soundManager : BaseSoundManager, soundUrl: string) : Promise<BaseSound> {
        return new Promise<BaseSound>((res) => {
            let sound = soundManager.get(soundUrl);
            if (sound !== null) {
                return res(sound);
            }
            loadPlugin.audio(soundUrl, soundUrl);
            loadPlugin.once('filecomplete-audio-' + soundUrl, () => res(soundManager.add(soundUrl)));
            loadPlugin.start();
        });
    }

    public async playSound(loadPlugin: LoaderPlugin, soundManager : BaseSoundManager, soundUrl: string, config: SoundConfig) : Promise<void> {
        console.log("play sound");
        const sound = await this.loadSound(loadPlugin,soundManager,soundUrl);

        sound.play(config);
        console.log("j'ai joué le son");
    }
}
export const soundManager = new SoundManager();