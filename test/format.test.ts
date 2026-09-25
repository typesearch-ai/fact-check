import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ago, compact, hostOf, seconds, usd } from '../lib/format.ts';

test('usd: tiny amounts keep their significant digits', () => {
  assert.equal(usd(0.0014), '$0.0014');
  assert.equal(usd(0.0022), '$0.0022');
  assert.equal(usd(0.00042), '$0.00042');
  assert.equal(usd(0.0176), '$0.0176');
  assert.equal(usd(0.25), '$0.25');
  assert.equal(usd(1.4), '$1.40');
  assert.equal(usd(0), '$0');
});

test('ago: minutes, hours, days', () => {
  const now = Date.parse('2026-09-25T12:00:00Z');
  assert.equal(ago('2026-09-25T11:59:40Z', now), 'just now');
  assert.equal(ago('2026-09-25T11:48:00Z', now), '12 min ago');
  assert.equal(ago('2026-09-25T09:00:00Z', now), '3 h ago');
  assert.equal(ago('2026-09-22T12:00:00Z', now), '3 d ago');
  assert.equal(ago(null, now), 'undated');
});

test('seconds, compact and hostOf', () => {
  assert.equal(seconds(850), '850 ms');
  assert.equal(seconds(1320), '1.3 s');
  assert.equal(compact(1900), '1.9k');
  assert.equal(compact(420), '420');
  assert.equal(hostOf('https://www.examplewire.example/a'), 'examplewire.example');
});
