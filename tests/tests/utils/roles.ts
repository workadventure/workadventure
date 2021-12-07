import { Role } from 'testcafe';

export function login(t: TestController, url: string, userName: string = "Alice", characterNumber: number = 2) {
    t = t
        .navigateTo(url)
        .typeText('input[name="loginSceneName"]', userName)
        .click('button.loginSceneFormSubmit');

    for (let i = 0; i < characterNumber; i++) {
        t = t.click('button.selectCharacterButtonRight');
    }

    return t.click('button.selectCharacterSceneFormSubmit')
        .click('button.letsgo');
}
