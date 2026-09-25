import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ndjsonResponse, readNdjson } from '../lib/ndjson.ts';

test('events go out one per line and come back in order, whatever the chunking', async () => {
  const sent = [{ type: 'a', n: 1 }, { type: 'b', text: 'línea con\nsalto' }, { type: 'c' }];
  const res = ndjsonResponse<(typeof sent)[number]>(async (send) => {
    for (const e of sent) send(e);
  }, new AbortController().signal);
  assert.equal(res.headers.get('content-type'), 'application/x-ndjson; charset=utf-8');
  const whole = new Uint8Array(await res.arrayBuffer());
  // Re-chunk byte by byte: a multi-byte character split across chunks must survive.
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (const b of whole) c.enqueue(new Uint8Array([b]));
      c.close();
    },
  });
  const got: unknown[] = [];
  await readNdjson(body, (e) => got.push(e));
  assert.deepEqual(got, sent);
});

test('after the client leaves, nothing more is sent', async () => {
  const ac = new AbortController();
  const res = ndjsonResponse<{ n: number }>(async (send) => {
    send({ n: 1 });
    ac.abort();
    send({ n: 2 });
  }, ac.signal);
  assert.equal(await res.text(), '{"n":1}\n');
});
