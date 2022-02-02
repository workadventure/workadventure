# Contributing to WorkAdventure

Are you looking to help on WorkAdventure? Awesome, feel welcome and read the following sections in order to know how to
ask questions and how to work on something.

## Contributions we are seeking

We love to receive contributions from our community — you!

There are many ways to contribute, from writing tutorials or blog posts, improving the documentation,
submitting bug reports and feature requests or writing code which can be incorporated into WorkAdventure itself.

## Contributing external resources

You can share your work on maps / articles / videos related to WorkAdventure on our [awesome-workadventure](https://github.com/workadventure/awesome-workadventure) list.

## Developer documentation

Documentation targeted at developers can be found in the [`/docs/dev`](docs/dev/)

## Using the issue tracker

First things first: **Do NOT report security vulnerabilities in public issues!**.
Please read the [security guide](SECURITY.md) to learn who to do a security disclosure to the WorkAdventure core team.

You can use [GitHub issue tracker](https://github.com/thecodingmachine/workadventure/issues) to:

- File bug reports
- Ask for feature requests

If you have more general questions, a good place to ask is [our Discord server](https://discord.gg/YGtngdh9gt).

Finally, you can come and talk to the WorkAdventure core team... on WorkAdventure, of course! [Our offices are here](https://play.staging.workadventu.re/@/tcm/workadventure/wa-village).

## Pull requests

Good pull requests - patches, improvements, new features - are a fantastic help. They should remain focused in scope
and avoid containing unrelated commits.

Please ask first before embarking on any significant pull request (e.g. implementing features, refactoring code),
otherwise you risk spending a lot of time working on something that the project's developers might not want to merge
into the project.

You can ask us on [Discord](https://discord.gg/YGtngdh9gt) or in the [GitHub issues](https://github.com/thecodingmachine/workadventure/issues).

### Linting your code

Before committing, be sure to install the "Prettier" precommit hook that will reformat your code to our coding style.

In order to enable the "Prettier" precommit hook, at the root of the project, run:

```console
$ yarn install
$ yarn run prepare
```

If you don't have the precommit hook installed (or if you committed code before installing the precommit hook), you will need
to run code linting manually:

```console
$ docker-compose exec front yarn run pretty
$ docker-compose exec pusher yarn run pretty
$ docker-compose exec back yarn run pretty
```

### Providing tests

WorkAdventure is based on a video game engine (Phaser), and video games are not the easiest programs to unit test.

Nevertheless, if your code can be unit tested, please provide a unit test (we use Jasmine), or an end-to-end test (we use Testcafe).

If you are providing a new feature, you should setup a test map in the `maps/tests` directory. The test map should contain
some description text describing how to test the feature.

* if the features is meant to be manually tested, you should modify the `maps/tests/index.html` file to add a reference
  to your newly created test map
* if the features can be automatically tested, please provide a testcafe test

#### Running testcafe tests

End-to-end tests are available in the "/tests" directory.

To run these tests locally:

```console
$ LIVE_RELOAD=0 docker-compose up -d
$ cd tests
$ npm install
$ npm run test
```

Note: If your tests fail on a Javascript error in "sockjs", this is due to the
Webpack live reload. The Webpack live reload feature is conflicting with testcafe. This is why we recommend starting
WorkAdventure with the `LIVE_RELOAD=0` environment variable.

End-to-end tests can take a while to run. To run only one test, use:

```console
$ npm run test -- tests/[name of the test file].ts
```

You can also run the tests inside a container (but you will not have visual feedbacks on your test, so we recommend using
the local tests).

```console
$ LIVE_RELOAD=0 docker-compose up -d
# Wait 2-3 minutes for the environment to start, then:
$ PROJECT_DIR=$(pwd) docker-compose -f docker-compose.testcafe.yml up
```

### A bad wording or a missing language

If you notice a translation error or missing language you can help us by following the [how to translate](docs/dev/how-to-translate.md) documentation.
