import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, keys, t, setLanguage, matchLanguage, getLanguage } from '../i18n.mjs';

test('all languages define the same keys', () => {
  const reference = keys('ja').sort();
  for (const language of Object.keys(LANGUAGES)) assert.deepEqual(keys(language).sort(), reference, language);
});

test('placeholders are kept in every translation', () => {
  const placeholders = text => (text.match(/\{\w+\}/g) ?? []).sort();
  for (const key of keys('ja')) {
    setLanguage('ja');
    const expected = placeholders(t(key, {}));
    for (const language of ['en', 'de']) {
      setLanguage(language);
      assert.deepEqual(placeholders(t(key, {})), expected, `${language}: ${key}`);
    }
  }
  setLanguage('ja');
});

test('translates with parameters and falls back to Japanese', () => {
  setLanguage('de');
  assert.equal(t('packet.invalid', { count: 3 }), 'Ungültige Pakete: 3');
  setLanguage('fr');
  assert.equal(getLanguage(), 'ja');
  assert.equal(t('signal.Red'), '赤');
});

test('matches browser languages', () => {
  assert.equal(matchLanguage(['fr-FR', 'de-AT', 'en']), 'de');
  assert.equal(matchLanguage(['en-US']), 'en');
  assert.equal(matchLanguage(['fr']), null);
});
