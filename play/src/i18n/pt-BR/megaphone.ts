import type { BaseTranslation } from "../i18n-types.ts";

const megaphone: BaseTranslation = {
    modal: {
        backToSelectCommunication: "Voltar para selecionar comunicação",
        selectCommunication: "Selecionar comunicação",
        title: "Comunicação global",
        selectCamera: "Selecione uma câmera 📹",
        selectMicrophone: "Selecione um microfone 🎙️",
        liveMessage: {
            startMegaphone: "Iniciar megafone",
            stopMegaphone: "Parar megafone",
            goingToStream: "Você vai transmitir",
            yourMicrophone: "seu microfone",
            yourCamera: "sua câmera",
            yourScreen: "sua tela",
            title: "Mensagem ao vivo",
            button: "Iniciar mensagem ao vivo",
            and: "e",
            toAll: "para todos os participantes",
            confirm: "Confirmar",
            cancel: "Cancelar",
            notice: `
            A mensagem ao vivo ou "Megafone" permite que você envie uma mensagem ao vivo com sua câmera e microfone para todas as pessoas conectadas na sala ou no mundo.

            Esta mensagem será exibida no canto inferior da tela, como uma chamada de vídeo ou discussão em bolha.

            Um exemplo de uso de mensagem ao vivo: "Olá pessoal, vamos começar a conferência? 🎉 Sigam meu avatar para a área da conferência e abram o aplicativo de vídeo 🚀"
            `,
            settings: "Configurações",
        },
        textMessage: {
            title: "Mensagem de texto",
            notice: `
            A mensagem de texto permite que você envie uma mensagem para todas as pessoas conectadas na sala ou no mundo.

            Esta mensagem será exibida como um popup no topo da página e será acompanhada por um som para identificar que a informação pode ser lida.

            Um exemplo de mensagem: "A conferência na sala 3 começa em 2 minutos 🎉. Vocês podem ir para a área da conferência 3 e abrir o aplicativo de vídeo 🚀"
            `,
            button: "Enviar uma mensagem de texto",
            noAccess: "Você não tem acesso a este recurso 😱 Por favor, entre em contato com o administrador 🙏",
        },
        audioMessage: {
            title: "Mensagem de áudio",
            notice: `
            A mensagem de áudio é uma mensagem do tipo "MP3, OGG..." enviada para todos os usuários conectados na sala ou no mundo.

            Esta mensagem de áudio será baixada e reproduzida para todas as pessoas que receberem esta notificação.

            Uma mensagem de áudio pode consistir em uma gravação de áudio que indica que uma conferência começará em alguns minutos.
            `,
            button: "Enviar uma mensagem de áudio",
            noAccess: "Você não tem acesso a este recurso 😱 Por favor, entre em contato com o administrador 🙏",
        },
    },
};

export default megaphone;
