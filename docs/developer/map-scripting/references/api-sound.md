---
sidebar_position: 1
---

# Sound

### Load a sound from an url

```
WA.sound.loadSound(url: string): Sound
```

Load a sound from an url

Please note that `loadSound` returns an object of the `Sound` class

The `Sound` class that represents a loaded sound contains two methods: `play(soundConfig : SoundConfig|undefined)` and `stop()`

```ts
class Sound {
  play(soundConfig: SoundConfig | undefined): void;
  stop(): void;
}
```

The parameter soundConfig is optional, if you call play without a Sound config the sound will be played with the basic configuration.

Example:

```javascript
var mySound = WA.sound.loadSound("Sound.ogg");
var config = {
  volume: 0.5,
  loop: false,
  rate: 1,
  detune: 1,
  delay: 0,
  seek: 0,
  mute: false,
};
mySound.play(config);
// ...
mySound.stop();
```
