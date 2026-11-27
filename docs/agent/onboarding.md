# Onboarding: tips, anchors and the world onboarding file

The onboarding engine lives in `play/src/front/Onboarding/` (rules, scheduler, runner, built-in items) and
`play/src/front/Components/Onboarding/` (its popover and modal). The world onboarding file's schema is
`libs/messages/src/JsonMessages/OnboardingData.ts`, exported to `docs/schema/onboarding.json`. Self-hosters read
`docs/others/self-hosting/onboarding.md`.

## Adding a tip

1. Write it in its group's file, `play/src/front/Onboarding/tips/<group>.ts`, typed `BuiltinOnboardingItem`, with the
   id `wa.<group>.<name>`. `<group>` is one of `OnboardingTipGroup` (`libs/messages`); a test checks it.
2. Place it in `tips/index.ts`, at the position its priority calls for: when two tips can start, the first one does.
3. Add its id, with the English label the SaaS editor shows, to `BuiltinTourId` in `libs/messages`. Without it, the
   tip does not compile.
4. Add its i18n keys in every locale (`npm run i18n:check` fails otherwise; see `i18n.md`).
5. Give it an item-level `skipIfUsed` with the analytics event the front sends when the feature is used, so that
   people who already use it never see it. `OnboardingWiring.test.ts` fails if the front never sends that event. Fix
   or add the event in the same change if its meaning does not fit.
6. Run `npm run export-json-schema` in `libs/messages`, and commit `docs/schema/` and the self-hosting guide it
   rewrites.

**Removing a tip:** remove its id from `BuiltinTourId` too; the sync test in `worldOnboarding.test.ts` says so.

## Adding an anchor

1. Add the literal and its label to `BuiltinOnboardingAnchor` (`libs/messages`). Its id up to the first dot is an
   `OnboardingAnchorArea`.
2. Attach it to the element: `{@attach onboarding("area.name")}`. `OnboardingWiring.test.ts` fails when an anchor is
   attached nowhere.
3. Run `npm run export-json-schema` in `libs/messages`: it rewrites the anchor tables of the self-hosting guide.

The Help menu says where an anchor shows up from its area. An anchor that only shows in a conversation needs a case
in `anchorPlace()`.

**Removing an anchor:** allowed in a minor release while the feature is marked experimental; say so in the release
notes.

## Changing the formats

- **A field of the world onboarding file:** a field that limits who sees an item, or when, goes in the item, never at
  the root or in `builtin`. An older front drops an item with a field it does not know, but only ignores an unknown
  field at the root or in `builtin`.
- **The stored state** (the `onboarding` player variable): it only gains optional fields. A new status value or a
  changed type needs a new variable name: a front that cannot read the state works without writing it.

## Tip text

Tip text does not hard-code UI labels, shortcut keys or URLs: it takes them as i18n parameters, and links to
`docs/user/*` for details, so that a UI change does not leave a tip stating something false.

## Debugging

Set `localStorage.debug = "onboarding"` and reload: each time it changes, the console lists every item with the reason
it starts or not (`Reason` in `onboardingRules.ts`).
