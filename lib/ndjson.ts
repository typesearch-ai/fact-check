/*
 * The briefing travels as newline-delimited JSON: one event per line, as soon as it exists. Plain
 * fetch on both ends, no framework protocol.
 */

export function ndjsonResponse<T>(run: (send: (event: T) => void, signal: AbortSignal) => Promise<void>, signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: T) => {
        if (signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await run(send, signal);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

/** Reads an NDJSON body, calling `onEvent` for each line. */
export async function readNdjson<T>(body: ReadableStream<Uint8Array>, onEvent: (event: T) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let nl = buffer.indexOf('\n');
    while (nl >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as T);
      nl = buffer.indexOf('\n');
    }
    if (done) break;
  }
  const rest = buffer.trim();
  if (rest) onEvent(JSON.parse(rest) as T);
}
