# How to translate WorkAdventure

## How the translation files work

In the translations folder, all json files of the form [namespace].[language code].json are interpreted to create languages by the language code in the file name.

The only mandatory file that is the entry point is the index.[language code].json which must contain the properties language, country and default so that the language can be taken into account.

Example:
```json
{
    "language": "English", # Language that will be used
    "country": "United States", # Country specification (e.g. British English and American English are not the same thing)
    "default": true # In some cases WorkAdventure only knows the language, not the country language of the browser. In this case it takes the language with the default property at true.
}
```

It does not matter where the file is placed in this folder. However, we have set up the following architecture in order to have a simple reading:

- translations/
    - [language code]/
        - [namepace].[language code].json

Example:
- translations/
    - en-US/
        - index.en-US.json
        - main-menu.en-US.json
        - chat.en-US.json
    - fr-FR/
        - index.fr-FR.json
        - main-menu.fr-FR.json
        - chat.fr-FR.json

## Add a new language

It is very easy to add a new language!

First, in the translations folder create a new folder with the language code as name (the language code according to [RFC 5646](https://datatracker.ietf.org/doc/html/rfc5646)).

In the previously created folder, add a file named as index.[language code].json with the following content:

```json
{
    "language": "Language Name",
    "country": "Country Name",
    "default": true
}
```

See the section above (*How the translation files work*) for more information on how this works.

BE CAREFUL if your language has variants by country don't forget to give attention to the default language used. If several languages are default the first one in the list will be used.

## Add a new key

### Add a simple key
The keys are searched by a path through the properties of the sub-objects and it is therefore advisable to write your translation as a JavaScript object.

Please use [kebab-case](https://en.wikipedia.org/wiki/Letter_case#Kebab_case) to name your keys!

Example:

```json
{
    "messages": {
        "coffe-machine":{
            "start": "Coffe machine has been started!"
        }
    }
}
```

In the code you can use it like this:

```js
translator._('messages.coffe-machine.start');
```

### Add a key with parameters

You can also use parameters to make the translation dynamic.
Use the tag {{ [parameter name] }} to apply your parameters in the translations

Example:

```json
{
    "messages": {
        "coffe-machine":{
            "player-start": "{{ playerName }} started the coffee machine!"
        }
    }
}
```

In the code you can use it like this:

```js
translator._('messages.coffe-machine.player-start', {
    playerName: "John"
});
```