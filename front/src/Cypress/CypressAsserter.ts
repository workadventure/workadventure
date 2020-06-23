declare let window:WindowWithCypressAsserter;

interface WindowWithCypressAsserter extends Window {
    cypressAsserter: CypressAsserter;
}

//this class is used to communicate with cypress, our e2e testing client
//Since cypress cannot manipulate canvas, we notified it with console logs
class CypressAsserter {

    constructor() {
        window.cypressAsserter = this
    }

    gameStarted() {
        console.log('Started the game')
    }

    preloadStarted() {
        console.log('Preloading')
    }

    preloadFinished() {
        console.log('Preloading done')
    }

    initStarted() {
        console.log('startInit')
    }

    initFinished() {
        console.log('startInit done')
    }
}

export const cypressAsserter = new CypressAsserter()
