import {AudioConfig, SpeechConfig, SpeechRecognizer} from "microsoft-cognitiveservices-speech-sdk";

export function speechRecognizerFactory(mediaStream: MediaStream) {
    const speechConfig = SpeechConfig.fromSubscription("", "francecentral");
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioConfig = AudioConfig.fromStreamInput(mediaStream);
    return new SpeechRecognizer(speechConfig, audioConfig);
}
