import type { BaseTranslation } from "../i18n-types.ts";

const camera: BaseTranslation = {
    editCam: "Editar câmera",
    editMic: "Editar microfone",
    editSpeaker: "Editar saída de áudio",
    active: "Ativo",
    disabled: "Desabilitado",
    notRecommended: "Não recomendado",
    enable: {
        title: "Ligue sua câmera e microfone",
        start: "Bem-vindo à nossa página de configuração de dispositivos de áudio e vídeo! Encontre aqui as ferramentas para melhorar sua experiência online. Ajuste as configurações às suas preferências para resolver possíveis problemas. Certifique-se de que seu hardware esteja conectado corretamente e atualizado. Explore e teste diferentes configurações para encontrar o que funciona melhor para você.",
    },
    help: {
        title: "Necessário acesso à câmera/microfone",
        permissionDenied: "Permissão negada",
        content: "Você deve permitir o acesso à câmera e ao microfone em seu navegador.",
        firefoxContent:
            'Por favor, clique na caixa de seleção "Lembrar esta decisão", se você não quiser que o Firefox continue pedindo a autorização.',
        allow: "Permitir webcam",
        continue: "Continuar sem webcam",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    webrtc: {
        title: "Erro de conexão do servidor de retransmissão de vídeo",
        titlePending: "Conexão do servidor de retransmissão de vídeo pendente",
        error: "Servidor TURN não está acessível",
        content:
            "O servidor de retransmissão de vídeo não pode ser alcançado. Você pode não conseguir se comunicar com outros usuários.",
        solutionVpn:
            "Se você está <strong>conectando via VPN</strong>, por favor desconecte da sua VPN e atualize a página web.",
        solutionVpnNotAskAgain: "Entendido. Não me avise novamente 🫡",
        solutionHotspot:
            "Se você está em uma rede restrita (rede da empresa...), tente trocar de rede. Por exemplo, crie um <strong>hotspot Wifi</strong> com seu telefone e conecte via seu telefone.",
        solutionNetworkAdmin: "Se você é um <strong>administrador de rede</strong>, revise o ",
        preparingYouNetworkGuide: 'guia "Preparando sua rede"',
        refresh: "Atualizar",
        continue: "Continuar",
        newDeviceDetected: "Novo dispositivo detectado {device} 🎉 Trocar? [ESPAÇO]",
    },
    my: {
        silentZone: "Zona silenciosa",
        silentZoneDesc:
            "Você está em uma zona silenciosa. Você só pode ver e ouvir as pessoas com quem está. Você não pode ver ou ouvir as outras pessoas na sala.",
        nameTag: "Você",
        loading: "Carregando sua câmera...",
    },
    disable: "Desligue sua câmera",
    menu: {
        moreAction: "Mais ações",
        closeMenu: "Fechar menu",
        senPrivateMessage: "Enviar mensagem privada (em breve)",
        kickoffUser: "Expulsar usuário",
        muteAudioUser: "Silenciar áudio",
        askToMuteAudioUser: "Pedir para silenciar áudio",
        muteAudioEveryBody: "Silenciar áudio para todos",
        muteVideoUser: "Silenciar vídeo",
        askToMuteVideoUser: "Pedir para silenciar vídeo",
        muteVideoEveryBody: "Silenciar vídeo para todos",
        blockOrReportUser: "Moderação",
    },
    backgroundEffects: {
        imageTitle: "Imagens de fundo",
        videoTitle: "Vídeos de fundo",
        blurTitle: "Desfoque de fundo",
        resetTitle: "Desativar efeitos de fundo",
        title: "Efeitos de fundo",
        close: "Fechar",
        blurAmount: "Quantidade de desfoque",
    },
};

export default camera;
