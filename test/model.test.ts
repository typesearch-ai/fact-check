import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseModel, DEFAULT_MODEL, gatewayCost, mockEnabled, modelProblem } from '../lib/model.ts';

test('the model: the gateway by default, the provider directly when its key is there', () => {
  assert.deepEqual(chooseModel({}), { id: DEFAULT_MODEL, route: 'gateway' });
  assert.deepEqual(chooseModel({ MODEL: 'openai/gpt-6-sol', OPENAI_API_KEY: 'k' }), { id: 'openai/gpt-6-sol', route: 'openai' });
  assert.deepEqual(chooseModel({ MODEL: 'anthropic/claude-sonnet-5', ANTHROPIC_API_KEY: 'k' }), { id: 'anthropic/claude-sonnet-5', route: 'anthropic' });
  assert.deepEqual(chooseModel({ MODEL: 'anthropic/claude-sonnet-5', OPENAI_API_KEY: 'k' }), { id: 'anthropic/claude-sonnet-5', route: 'gateway' });
});

test('the gateway needs a key, except on Vercel', () => {
  const gw = chooseModel({});
  assert.match(modelProblem(gw, {}) ?? '', /AI_GATEWAY_API_KEY/);
  assert.equal(modelProblem(gw, { AI_GATEWAY_API_KEY: 'k' }), null);
  assert.equal(modelProblem(gw, { VERCEL: '1' }), null);
  assert.equal(modelProblem(chooseModel({ OPENAI_API_KEY: 'k' }), {}), null);
});

test('demo data only when asked, and never in Vercel production', () => {
  assert.equal(mockEnabled({}), false);
  assert.equal(mockEnabled({ DEMO_MOCK: '1' }), true);
  assert.equal(mockEnabled({ DEMO_MOCK: '1', VERCEL_ENV: 'production' }), false);
  assert.equal(chooseModel({ DEMO_MOCK: '1' }).route, 'mock');
});

test('gatewayCost reads the price the gateway reports', () => {
  assert.equal(gatewayCost({ gateway: { cost: '0.00042' } }), 0.00042);
  assert.equal(gatewayCost({ gateway: { cost: 0.001 } }), 0.001);
  assert.equal(gatewayCost({ openai: {} }), null);
  assert.equal(gatewayCost(undefined), null);
});
