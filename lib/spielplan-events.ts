type SpielplanEventClient = ReadableStreamDefaultController<Uint8Array>;

interface SpielplanEventStore {
  clients: Set<SpielplanEventClient>;
  version: number;
}

interface SpielplanUpdateDetails {
  reason?: string;
  spielId?: string;
  status?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __svpSpielplanEvents: SpielplanEventStore | undefined;
}

const encoder = new TextEncoder();
const store = globalThis.__svpSpielplanEvents ??= {
  clients: new Set<SpielplanEventClient>(),
  version: 0,
};

export function createSpielplanEventStream(signal?: AbortSignal) {
  let controllerRef: SpielplanEventClient | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const cleanup = () => {
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = undefined;
    }

    if (controllerRef) {
      store.clients.delete(controllerRef);
      controllerRef = undefined;
    }
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      store.clients.add(controller);

      safeEnqueue(controller, encoder.encode("retry: 5000\n: connected\n\n"));

      keepAlive = setInterval(() => {
        safeEnqueue(controller, encoder.encode(`: keepalive ${Date.now()}\n\n`));
      }, 25000);

      signal?.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      cleanup();
    },
  });
}

export function notifySpielplanChanged(details: SpielplanUpdateDetails = {}) {
  store.version += 1;

  const payload = encodeEvent("spielplan:update", {
    type: "spielplan:update",
    version: store.version,
    changedAt: new Date().toISOString(),
    ...details,
  });

  for (const client of [...store.clients]) {
    safeEnqueue(client, payload);
  }

  return store.version;
}

function encodeEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function safeEnqueue(controller: SpielplanEventClient, chunk: Uint8Array) {
  try {
    controller.enqueue(chunk);
  } catch {
    store.clients.delete(controller);
  }
}
