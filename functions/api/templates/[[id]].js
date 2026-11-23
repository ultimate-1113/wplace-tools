import { catalog, get, share } from "../../../server/storage.js";
import { LIMIT } from "../../../template.js";
export async function onRequest({ request, params, env }) {
  try {
    const id = [params.id].flat().filter(Boolean).join("/");
    if (request.method === "GET") {
      if (!id) return Response.json(await catalog(env.DB));
      return new Response(await get(env.DB, id), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (request.method !== "POST" || id)
      return new Response(null, { status: 405 });
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin)
      return new Response(null, { status: 403 });
    const reader = request.body?.getReader(),
      decoder = new TextDecoder("utf-8", { fatal: true });
    let size = 0,
      source = "";
    if (!reader) throw Error("ファイルを指定してください");
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > LIMIT) {
        await reader.cancel();
        return Response.json(
          { error: "アップロード上限は1.5 MBです" },
          { status: 413 },
        );
      }
      source += decoder.decode(value, { stream: true });
    }
    const saved = await share(
      env.DB,
      source + decoder.decode(),
      request.headers.get("Idempotency-Key"),
    );
    return Response.json({ id: saved, url: "/junctionTemplates?id=" + saved });
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status ?? 400 });
  }
}
