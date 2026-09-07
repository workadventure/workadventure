import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Trạng thái ổn ✅",
        offLine: "Trạng thái ngoại tuyến ❌",
        warning: "Trạng thái cảnh báo ⚠️",
        sync: "Đang đồng bộ 🔄",
    },
    teams: {
        openingMeeting: "Đang mở cuộc họp Teams...",
        unableJoinMeeting: "Không thể tham gia cuộc họp Teams!",
        userNotConnected: "Bạn chưa đồng bộ với tài khoản Outlook hoặc Google của mình!",
        connectToYourTeams: "Kết nối tài khoản Outlook hoặc Google của bạn 🙏",
        temasAppInfo:
            "Teams là ứng dụng Microsoft 365 giúp đội của bạn luôn kết nối và có tổ chức. Bạn có thể nhắn tin, họp, gọi và cộng tác tất cả ở một nơi 😍",
        buttonSync: "Đồng bộ Teams của tôi 🚀",
        buttonConnect: "Kết nối Teams của tôi 🚀",
        meetingPopupWaiting: {
            title: "Cuộc họp Microsoft Teams 🎉",
            subtitle: "Cuộc họp Teams chưa được tạo... đang tiến hành 💪",
            guestExplain:
                "Vui lòng đăng nhập vào nền tảng để tạo cuộc họp Teams trực tuyến hoặc nhờ chủ phòng tạo giúp bạn 🚀",
            guestError: "Bạn chưa đăng nhập nên không thể tạo cuộc họp Teams trực tuyến 😭",
            missingScope: "Không tạo được cuộc họp: tài khoản Microsoft của bạn không được phép tạo cuộc họp.",
            missingScopeExplain:
                "Hãy chờ một người tham gia có quyền tạo, hoặc kết nối lại — nếu quản trị viên vừa bật quyền này thì kết nối lại là đủ.",
            error: "Không thể tạo cuộc họp Teams.",
            errorExplain: "Đừng lo, bạn vẫn có thể tham gia khi người khác tạo cuộc họp 🙏",
            reconnect: "Kết nối lại Teams",
        },
    },
    discord: {
        integration: "TÍCH HỢP",
        explainText:
            "Khi kết nối tài khoản Discord tại đây, bạn sẽ nhận được tin nhắn của mình ngay trong khung trò chuyện WorkAdventure. Sau khi đồng bộ một máy chủ, chúng tôi sẽ tạo các phòng tương ứng, bạn chỉ cần tham gia chúng trong khung trò chuyện WorkAdventure.",
        login: "Kết nối Discord",
        fetchingServer: "Đang lấy các máy chủ Discord của bạn... 👀",
        qrCodeTitle: "Quét mã QR bằng ứng dụng Discord để đăng nhập.",
        qrCodeExplainText:
            "Quét mã QR bằng ứng dụng Discord để đăng nhập. Mã QR có thời hạn, đôi khi bạn cần tạo lại mã mới",
        qrCodeRegenerate: "Lấy mã QR mới",
        tokenInputLabel: "Token Discord",
        loginToken: "Đăng nhập bằng token",
        loginTokenExplainText: "Bạn cần nhập token Discord của mình. Để thực hiện tích hợp Discord, xem",
        sendDiscordToken: "gửi",
        tokenNeeded: "Bạn cần nhập token Discord của mình. Để thực hiện tích hợp Discord, xem",
        howToGetTokenButton: "Cách lấy token đăng nhập Discord của tôi",
        loggedIn: "Đã kết nối với:",
        saveSync: "Lưu và đồng bộ",
        logout: "Đăng xuất",
        back: "Quay lại",
        tokenPlaceholder: "Token Discord của bạn",
        loginWithQrCode: "Đăng nhập bằng mã QR",
        guilds: "Máy chủ Discord",
        guildExplain: "Chọn các kênh bạn muốn thêm vào giao diện trò chuyện WorkAdventure.\n",
    },
    outlook: {
        signIn: "Đăng nhập với Outlook",
        popupScopeToSync: "Kết nối tài khoản Outlook của tôi",
        popupScopeToSyncExplainText:
            "Chúng tôi cần kết nối tài khoản Outlook của bạn để đồng bộ lịch và/hoặc công việc. Nhờ đó bạn có thể xem các cuộc họp và công việc của mình trong WorkAdventure và tham gia trực tiếp từ bản đồ.",
        popupScopeToSyncCalendar: "Đồng bộ lịch của tôi",
        popupScopeToSyncTask: "Đồng bộ công việc của tôi",
        popupCancel: "Hủy",
        isSyncronized: "Đã đồng bộ với Outlook",
        popupScopeIsConnectedExplainText: "Bạn đã kết nối rồi, vui lòng bấm nút để đăng xuất và kết nối lại.",
        popupScopeIsConnectedButton: "Đăng xuất",
        popupErrorTitle: "⚠️ Đồng bộ mô-đun Outlook hoặc Teams thất bại",
        popupErrorDescription: "Khởi tạo đồng bộ mô-đun Outlook hoặc Teams đã thất bại. Vui lòng thử kết nối lại.",
        popupErrorContactAdmin: "Nếu sự cố vẫn tiếp diễn, vui lòng liên hệ quản trị viên của bạn.",
        popupErrorShowMore: "Xem thêm thông tin",
        popupErrorMoreInfo1:
            "Có thể có sự cố trong quá trình đăng nhập. Vui lòng kiểm tra nhà cung cấp SSO Azure đã được cấu hình đúng.",
        popupErrorMoreInfo2:
            'Vui lòng kiểm tra scope "offline_access" đã được bật cho nhà cung cấp SSO Azure. Scope này bắt buộc để lấy refresh token và giữ mô-đun Teams hoặc Outlook luôn kết nối.',
    },
    google: {
        signIn: "Đăng nhập với Google",
        popupScopeToSync: "Kết nối tài khoản Google của tôi",
        popupScopeToSyncExplainText:
            "Chúng tôi cần kết nối tài khoản Google của bạn để đồng bộ lịch và/hoặc công việc. Nhờ đó bạn có thể xem các cuộc họp và công việc của mình trong WorkAdventure và tham gia trực tiếp từ bản đồ.",
        popupScopeToSyncCalendar: "Đồng bộ lịch của tôi",
        popupScopeToSyncTask: "Đồng bộ công việc của tôi",
        popupCancel: "Hủy",
        isSyncronized: "Đã đồng bộ với Google",
        popupScopeToSyncMeet: "Tạo cuộc họp trực tuyến",
        popupScopeToSyncMeetHelp: "Bắt buộc để tạo cuộc họp trong các khu vực Google Meet.",
        openingMeet: "Đang mở Google Meet... 🙏",
        unableJoinMeet: "Không thể tham gia Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Đang tạo Google Space của bạn… chỉ mất vài giây 💪",
            guestError: "Bạn chưa đăng nhập nên không thể tạo Google Meet 😭",
            guestExplain: "Vui lòng đăng nhập vào nền tảng để tạo Google Meet, hoặc nhờ chủ phòng tạo giúp bạn 🚀",
            error: "Cài đặt Google Workspace của bạn không cho phép tạo Meet.",
            errorExplain: "Đừng lo, bạn vẫn có thể tham gia khi người khác chia sẻ liên kết 🙏",
            missingScope: "Không tạo được cuộc họp: tài khoản Google của bạn chưa cấp quyền tạo cuộc họp.",
            missingScopeExplain: "Hãy chờ một người tham gia có quyền tạo, hoặc kết nối lại và cho phép tạo cuộc họp.",
            reconnect: "Kết nối lại Google",
        },
        popupScopeIsConnectedButton: "Đăng xuất",
        popupScopeIsConnectedExplainText: "Bạn đã kết nối rồi, vui lòng bấm nút để đăng xuất và kết nối lại.",
    },
    calendar: {
        title: "Cuộc họp hôm nay của bạn",
        joinMeeting: "Bấm vào đây để tham gia cuộc họp",
    },
    todoList: {
        title: "Việc cần làm",
        sentence: "Nghỉ một chút đi 🙏 làm tách cà phê hay trà nhé? ☕",
    },
};

export default externalModule;
