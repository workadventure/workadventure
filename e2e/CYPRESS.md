# Testing with cypress

This project use [cypress](https://www.cypress.io/) to do functional testing of the website.
Unfortunately we cannot integrate it with docker-compose for the moment, so you will need to install some packages locally on your pc. 

## Getting Started

You will need to install theses dependancies on linux (don't know about mac):

```bash
sudo apt update
sudo apt install libgtk2.0-0 libgtk-3-0 libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2 libxtst6 xauth xvfb
```

Cypress can be installed locally in the e2e directory
```bash
cd e2e
npm install
```


How to use:
```bash
npm run cy:run
npm run cy:open
```

The first command will run all tests in the terminal, while the second will open the interactive task runner which allow you to easily manage the test workflow 

[More details here](https://docs.cypress.io/guides/getting-started/testing-your-app.html#Step-1-Start-your-server)

## How to test a game

Cypress cannot "see" and so cannot directly manipulate the canva created by Phaser. 

This means we have to do workarounds such as exposing core objects in the window so that cypress can manipulate them or doing console that cypress can catch.