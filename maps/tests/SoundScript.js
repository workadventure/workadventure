var zonePlaySound = "PlaySound";
var zonePlaySoundLoop = "playSoundLoop";
var stopSound = "StopSound";
var loopConfig ={
    volume : 0.5,
    loop : true
}
var configBase = {
    volume : 0.5,
    loop : false
}
var enterSoundUrl = "webrtc-in.mp3";
var exitSoundUrl = "webrtc-out.mp3";
var winSoundUrl = "Win.ogg";
var enterSound;
var exitSound;
var winSound;
loadAllSounds();
winSound.play(configBase);
WA.onEnterZone(zonePlaySound, () => {
enterSound.play(configBase);
})

WA.onEnterZone(zonePlaySoundLoop, () => {
winSound.play(loopConfig);
})

WA.onLeaveZone(zonePlaySoundLoop, () => {
    winSound.stop();
})

WA.onEnterZone('popupZone', () => {

});

WA.onLeaveZone('popupZone', () => {

})

 function loadAllSounds(){
   winSound     =  WA.loadSound(winSoundUrl);
   enterSound   =  WA.loadSound(enterSoundUrl);
   exitSound    =  WA.loadSound(exitSoundUrl);
 }
