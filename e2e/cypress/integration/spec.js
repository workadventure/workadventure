Cypress.on('window:before:load', (win) => {
	// because this is called before any scripts
	// have loaded - the ga function is undefined
	// so we need to create it.
	win.cypressAsserter = cy.stub().as('ca')
})

describe('WorkAdventureGame', () => {
	beforeEach(() => {
		cy.visit('/', {
			onBeforeLoad (win) {
				cy.spy(win.console, 'log').as('console.log')
			},
		})
		
	});

	it('loads', () => {
		cy.get('@console.log').should('be.calledWith', 'Started the game')
		cy.get('@console.log').should('be.calledWith', 'Preloading')
		cy.get('@console.log').should('be.calledWith', 'Preloading done')
		cy.get('@console.log').should('be.calledWith', 'startInit')
		cy.get('@console.log').should('be.calledWith', 'startInit done')
	});
});