import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "오디오 볼륨 변경",
    manager: {
        reduce: "말하는 동안 오디오 플레이어 볼륨 줄이기",
        allow: "오디오 허용",
        error: "사운드를 불러오지 못했습니다",
        notAllowed: "▶️ 오디오가 허용되지 않았습니다. [SPACE] 키를 누르거나 여기를 클릭해 재생하세요!",
    },
    message: "오디오 메시지",
    disable: "마이크 끄기",
};

export default audio;
