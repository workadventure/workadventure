import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        selectCamera: "카메라 선택 📹",
        selectMicrophone: "마이크 선택 🎙️",
        liveMessage: {
            startMegaphone: "확성기 시작",
            stopMegaphone: "확성기 중지",
            goingToStream: "스트리밍하려는 것",
            yourMicrophone: "마이크",
            yourCamera: "카메라",
            yourScreen: "화면",
            title: "실시간 메시지",
            button: "실시간 메시지 시작",
            and: "및",
            toAll: "모든 참가자에게",
            confirm: "확인",
            cancel: "취소",
            notice: `
            실시간 메시지 또는 "확성기"를 사용하면 카메라와 마이크를 사용하여 방이나 월드에 연결된 모든 사람들에게 실시간 메시지를 보낼 수 있습니다.

            이 메시지는 화면 하단 모서리에 화상 통화나 말풍선 대화처럼 표시됩니다.

            실시간 메시지 사용 사례 예: "안녕하세요 여러분, 회의를 시작할까요? 🎉 제 아바타를 따라 회의 구역으로 가서 비디오 앱을 여세요 🚀"
            `,
            settings: "설정",
        },
        textMessage: {
            title: "텍스트 메시지",
            notice: `
            텍스트 메시지를 사용하면 방이나 월드에 연결된 모든 사람들에게 메시지를 보낼 수 있습니다.

            이 메시지는 페이지 상단에 팝업으로 표시되며 정보를 읽을 수 있음을 알리는 소리가 함께 재생됩니다.

            메시지 예: "3번 방에서 2분 후에 회의가 시작됩니다 🎉. 회의 구역 3으로 가서 비디오 앱을 여세요 🚀"
            `,
            button: "텍스트 메시지 보내기",
            noAccess: "이 기능에 액세스할 수 없습니다 😱 관리자에게 문의하세요 🙏",
        },
        audioMessage: {
            title: "오디오 메시지",
            notice: `
            오디오 메시지는 방이나 월드에 연결된 모든 사용자에게 전송되는 "MP3, OGG..." 유형의 메시지입니다.

            이 오디오 메시지는 이 알림을 받는 모든 사람에게 다운로드되어 재생됩니다.

            오디오 메시지는 몇 분 후에 회의가 시작될 것임을 나타내는 녹음으로 구성될 수 있습니다.
            `,
            button: "오디오 메시지 보내기",
            noAccess: "이 기능에 액세스할 수 없습니다 😱 관리자에게 문의하세요 🙏",
        },
    },
};

export default megaphone;
