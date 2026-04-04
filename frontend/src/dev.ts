import homepage from "../index.html";

const publicPort = 34115;
const publicHttpOrigin = `http://localhost:${publicPort}`;

type ProxySocketData = {
  queue: (string | ArrayBuffer | Uint8Array)[];
  upstream: WebSocket | null;
  upstreamUrl: string;
};

function normalizeWsPayload(
  message: string | ArrayBuffer | Uint8Array<ArrayBufferLike>,
) {
  if (typeof message === "string" || message instanceof ArrayBuffer) {
    return message;
  }

  return new Uint8Array(message);
}

const wailsDevShim = `
<script>
  (function () {
    var publicPort = ${JSON.stringify(String(publicPort))};
    var publicMapOrigin = ${JSON.stringify(publicHttpOrigin)};
    var OrigWS = window.WebSocket;

    function normalizeWsUrl(url) {
      if (typeof url !== "string" || !/^wails:/.test(url)) {
        return url;
      }

      return url
        .replace(/^wails:/, "ws:")
        .replace(/wails\\.localhost(?::\\d+)?/, "localhost:" + publicPort);
    }

    function PatchedWS(url, protocols) {
      var normalizedUrl = normalizeWsUrl(url);
      return protocols ? new OrigWS(normalizedUrl, protocols) : new OrigWS(normalizedUrl);
    }

    PatchedWS.prototype = OrigWS.prototype;
    PatchedWS.CONNECTING = OrigWS.CONNECTING;
    PatchedWS.OPEN = OrigWS.OPEN;
    PatchedWS.CLOSING = OrigWS.CLOSING;
    PatchedWS.CLOSED = OrigWS.CLOSED;
    window.WebSocket = PatchedWS;

    var OrigBlob = window.Blob;
    window.Blob = function (parts, options) {
      if (options && options.type === "application/javascript" && Array.isArray(parts)) {
        parts = parts.map(function (part) {
          if (part instanceof ArrayBuffer || ArrayBuffer.isView(part)) {
            var text = new TextDecoder().decode(part);
            return new TextEncoder().encode(
              text.replace(
                /\\n\\/\\/# sourceMappingURL=(\\/_bun\\/client\\/[^\\n]*)/g,
                "\\n//# sourceMappingURL=" + publicMapOrigin + "$1"
              )
            );
          }

          if (typeof part === "string") {
            return part.replace(
              /\\n\\/\\/# sourceMappingURL=(\\/_bun\\/client\\/[^\\n]*)/g,
              "\\n//# sourceMappingURL=" + publicMapOrigin + "$1"
            );
          }

          return part;
        });
      }

      return new OrigBlob(parts, options);
    };
    window.Blob.prototype = OrigBlob.prototype;
  })();
</script>`;

function injectDevShim(html: string) {
  return html.replace("</head>", `  ${wailsDevShim}\n</head>`);
}

function absolutizeSourceMapUrls(text: string) {
  return text.replace(
    /\n\/\/# sourceMappingURL=(\/_bun\/client\/[^\n]*)/g,
    `\n//# sourceMappingURL=${publicHttpOrigin}$1`,
  );
}

function proxyUrlFor(requestUrl: string, targetOrigin: string) {
  const url = new URL(requestUrl);
  return `${targetOrigin}${url.pathname}${url.search}`;
}

const upstreamServer = Bun.serve({
  port: 0,
  development: true,
  routes: {
    "/*": homepage,
  },
});

const upstreamHttpOrigin = `http://localhost:${upstreamServer.port}`;
const upstreamWsOrigin = `ws://localhost:${upstreamServer.port}`;

const proxyServer = Bun.serve<ProxySocketData>({
  port: publicPort,
  async fetch(request, server) {
    if (
      server.upgrade(request, {
        data: {
          queue: [],
          upstream: null,
          upstreamUrl: proxyUrlFor(request.url, upstreamWsOrigin),
        },
      })
    ) {
      return;
    }

    const upstreamResponse = await fetch(
      new Request(proxyUrlFor(request.url, upstreamHttpOrigin), request),
    );
    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    const url = new URL(request.url);

    if (request.method === "GET" && contentType.startsWith("text/html")) {
      const html = injectDevShim(await upstreamResponse.text());
      const headers = new Headers(upstreamResponse.headers);
      headers.delete("content-length");
      return new Response(html, {
        headers,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
    }

    if (
      request.method === "GET" &&
      url.pathname.startsWith("/_bun/client/") &&
      contentType.startsWith("text/javascript")
    ) {
      const script = absolutizeSourceMapUrls(await upstreamResponse.text());
      const headers = new Headers(upstreamResponse.headers);
      headers.delete("content-length");
      return new Response(script, {
        headers,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
    }

    return upstreamResponse;
  },
  websocket: {
    open(ws) {
      const upstream = new WebSocket(ws.data.upstreamUrl);
      ws.data.upstream = upstream;

      upstream.binaryType = "arraybuffer";

      upstream.addEventListener("open", () => {
        for (const message of ws.data.queue) {
          upstream.send(normalizeWsPayload(message));
        }
        ws.data.queue.length = 0;
      });

      upstream.addEventListener("message", (event) => {
        ws.send(event.data);
      });

      upstream.addEventListener("close", (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(event.code, event.reason);
        }
      });

      upstream.addEventListener("error", () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1011, "Upstream dev server error");
        }
      });
    },
    message(ws, message) {
      const upstream = ws.data.upstream;
      if (!upstream || upstream.readyState === WebSocket.CONNECTING) {
        ws.data.queue.push(message);
        return;
      }

      upstream.send(normalizeWsPayload(message));
    },
    close(ws, code, reason) {
      const upstream = ws.data.upstream;
      if (upstream && upstream.readyState < WebSocket.CLOSING) {
        upstream.close(code, reason);
      }
    },
  },
});

console.log(`Dev proxy running at http://localhost:${proxyServer.port}`);
console.log(
  `Upstream Bun server running at http://localhost:${upstreamServer.port}`,
);
