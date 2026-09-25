import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cited, normalizeCitations, pieces, punctuateFirst, segments, stripCitations } from '../lib/citations.ts';

test('segments: text and citations, in order', () => {
  assert.deepEqual(segments('Prices rose [2]. Wages did not [1][3].', 3), [
    { type: 'text', text: 'Prices rose' },
    { type: 'cite', n: 2 },
    { type: 'text', text: '. Wages did not' },
    { type: 'cite', n: 1 },
    { type: 'cite', n: 3 },
    { type: 'text', text: '.' },
  ]);
});

test('segments: [1, 3] and [1;3] are two citations', () => {
  const s = segments('A [1, 3]. B [2;1].', 3).filter((x) => x.type === 'cite');
  assert.deepEqual(s, [
    { type: 'cite', n: 1 },
    { type: 'cite', n: 3 },
    { type: 'cite', n: 2 },
    { type: 'cite', n: 1 },
  ]);
});

test('a citation to a source that does not exist is dropped', () => {
  assert.deepEqual(segments('Claim [9]. Other [0] [2].', 3), [
    { type: 'text', text: 'Claim. Other' },
    { type: 'cite', n: 2 },
    { type: 'text', text: '.' },
  ]);
  assert.deepEqual(cited('Claim [9]. Other [0] [2].', 3), [2]);
});

test('repeated consecutive citations collapse', () => {
  assert.equal(normalizeCitations('One [1][1] two [2].', 2), 'One[1] two[2].');
});

test('cited: distinct valid numbers in order of appearance', () => {
  assert.deepEqual(cited('x [3] y [1][3] z [5]', 4), [3, 1]);
});

test('stripCitations: the plain text', () => {
  assert.equal(stripCitations('Prices rose [2]. Wages did not [1][3].'), 'Prices rose. Wages did not.');
});

test('brackets that are not citations stay', () => {
  assert.equal(normalizeCitations('The [sic] quote [1].', 1), 'The [sic] quote[1].');
});

test('punctuateFirst: the period goes before the citations, as in print', () => {
  const s = punctuateFirst(segments('Nine minutes [1][2]. Then 2028 [1].', 2));
  assert.deepEqual(s, [
    { type: 'text', text: 'Nine minutes.' },
    { type: 'cite', n: 1 },
    { type: 'cite', n: 2 },
    { type: 'text', text: ' Then 2028.' },
    { type: 'cite', n: 1 },
  ]);
  assert.deepEqual(punctuateFirst(segments('No punctuation [1] after.', 1)), segments('No punctuation [1] after.', 1));
});

test('pieces: each group of citations travels with the word before it', () => {
  assert.deepEqual(pieces('It rose [1][2]. Then it fell [3].', 3), [
    { type: 'text', text: 'It ' },
    { type: 'cited', word: 'rose.', cites: [1, 2] },
    { type: 'text', text: ' Then it ' },
    { type: 'cited', word: 'fell.', cites: [3] },
  ]);
  assert.deepEqual(pieces('[1] At the start.', 1), [
    { type: 'cited', word: '', cites: [1] },
    { type: 'text', text: ' At the start.' },
  ]);
});
