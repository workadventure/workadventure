describe('WorkAdventureGame', () => {
	beforeEach(() => {
		cy.visit('/', {})
		
	});

	it('loads', async () => {
		let win = await cy.window()
		expect(win.cypressAsserter.gameStarted).to.equal(true);
	});

	it('reach the login page', async () => {
		let win = await cy.window()
		//todo: find a way to use a spy instead of checcking for a value
		//cy.spy(win.cypressAsserter, 'reachedLoginScene')
		//expect(win.cypressAsserter.reachedLoginScene).to.be.called;
		expect(win.cypressAsserter.loginPage).to.equal(true);
	});

	it('can connect and get to the gameScene', async () => {
		let win = await cy.window()
		cy.spy(win.cypressAsserter, 'reachedGameScene')
		await win.cypressAsserter.remoteConnect()
		expect(win.cypressAsserter.reachedGameScene).to.be.called;
	});
});