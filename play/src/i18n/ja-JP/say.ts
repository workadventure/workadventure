import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "言う",
        think: "考える",
    },
    placeholder: "ここにメッセージを入力...",
    button: "バブルを作成",
    tooltip: {
        description: {
            say: "キャラクターの上にチャットバブルを表示します。マップ上の全員に表示され、5秒間表示されたままになります。",
            think: "キャラクターの上に思考バブルを表示します。マップ上のすべてのプレイヤーに表示され、移動するまで表示されたままになります。",
        },
    },
};

export default say;
