import { Role } from 'testcafe';

export const userAliceOnPage = (url: string) => Role(url, async t => {
    await t
        .typeText('input[name="loginSceneName"]', 'Alice')
        .click('button.loginSceneFormSubmit')
        .click('button.selectCharacterButtonRight')
        .click('button.selectCharacterButtonRight')
        .click('button.selectCharacterSceneFormSubmit')
        .click('button.letsgo');
});


export const userAlice = Role('http://play.workadventure.localhost/', async t => {
    await t
        .typeText('input[name="loginSceneName"]', 'Alice')
        .click('button.loginSceneFormSubmit')
        .click('button.selectCharacterButtonRight')
        .click('button.selectCharacterButtonRight')
        .click('button.selectCharacterSceneFormSubmit')
        .click('button.letsgo');
});

export const userBob = Role('http://play.workadventure.localhost/', async t => {
    await t
        .typeText('input[name="loginSceneName"]', 'Bob')
        .click('button.loginSceneFormSubmit')
        .click('button.selectCharacterButtonRight')
        .click('button.selectCharacterSceneFormSubmit')
        .click('button.letsgo');
});
