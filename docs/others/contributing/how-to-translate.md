# How to translate WorkAdventure

We use the [typesafe-i18n](https://github.com/ivanhofer/typesafe-i18n) package to handle the translation.

## Add a new language

It is very easy to add a new language!

First, in the `play/src/i18n` folder create a new folder with the language code as name (the language code according to [RFC 5646](https://datatracker.ietf.org/doc/html/rfc5646)).

In the previously created folder, add a file named index.ts with the following content containing your language information (french from France in this example):

```ts
import type { Translation } from "../i18n-types";

const fr_FR: Translation = {
  ...en_US,
  language: "Français",
  country: "France",
};

export default fr_FR;
```

## Add a new key

### Add a simple key

The keys are searched by a path through the properties of the sub-objects and it is therefore advisable to write your translation as a JavaScript object.

Please use kamelcase to name your keys!

Example:

```ts
{
  messages: {
    coffeMachine: {
      start: "Coffe machine has been started!";
    }
  }
}
```

In the code you can translate using `$LL`:

```ts
import LL from "../../i18n/i18n-svelte";

console.log($LL.messages.coffeMachine.start());
```

### Add a key with parameters

You can also use parameters to make the translation dynamic.
Use the tag { [parameter name] } to apply your parameters in the translations

Example:

```ts
{
  messages: {
    coffeMachine: {
      playerStart: "{ playerName } started the coffee machine!";
    }
  }
}
```

In the code you can use it like this:

```ts
$LL.messages.coffeMachine.playerStart.start({
  playerName: "John",
});
```

## Check missing translations (diff tool)

Use the helper script located in `play/scripts/diff-i18n.ts` to audit missing keys.

- Summary across all locales (source defaults to `en-US`):

```bash
cd play
npm run i18n:diff
# Prints, for each locale, the number of missing keys and missing files
```

- Detailed diff for a specific locale (compare that locale to `en-US`):

```bash
cd play
npm run i18n:diff -- fr-FR
```

- Advanced: specify both target and source locales:

```bash
cd play
npm run i18n:diff -- ar-SA fr-FR  # compare (ar-SA translations to fr-FR)
```

Tip: from the summary output, run `npm run i18n:diff -- <language-code>` to see the exact missing modules/keys for that locale.

The detailed output lists modules and keys missing in the target locale, helping translators keep parity with source files (placeholders preserved).
