import assert from "node:assert/strict";
import { LIMIT } from "../template.js";
const host = "http://127.0.0.1:8788";
async function rpc(method, params) {
  const r = await fetch(host + "/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await r.text(),
    message = JSON.parse(
      body.startsWith("event:") ? body.split("data: ")[1].split("\n")[0] : body,
    );
  assert.ok(message.result, JSON.stringify(message.error));
  return message.result;
}
async function call(name, args) {
  const r = await rpc("tools/call", { name, arguments: args });
  assert.ok(!r.isError, JSON.stringify(r.content));
  return r.structuredContent;
}
const url = "https://wplace.live/?lat=0&lng=0";
assert.ok((await rpc("tools/list", {})).tools.length >= 9);
assert.equal((await call("url_to_coordinates", { url })).worldX, 1024000);
assert.equal(
  (await call("plan_polyline", { start: url, end: url })).bend,
  null,
);
assert.equal((await call("calculate_paint", { start: url, end: url })).dx, 0);
assert.equal(
  (
    await call("estimate_finish", {
      date1: "2026-04-01T12:00",
      date2: "2026-04-01T13:00",
      remaining1: 120,
      remaining2: 60,
    })
  ).finishDate,
  "2026-04-01T05:00:00.000Z",
);
assert.equal(
  (
    await call("convert_map_url", {
      url: "https://wplace.live/?lat=25&lng=137.8",
    })
  ).urls.length,
  1,
);
const road = await call("generate_road", {
  kind: "circle",
  center: url,
  radius: 20,
});
const png = await rpc("resources/read", { uri: road.resources[0] });
assert.equal(png.contents[0].mimeType, "image/png");
const source = await (await fetch(road.download)).text();
const args = { requestKey: crypto.randomUUID(), source };
const first = await call("share_template", args);
assert.deepEqual(await call("share_template", args), first);
assert.equal((await call("get_template", { id: first.id })).source, source);
assert.ok(
  !(await call("list_templates", {})).templates.some((t) => t.id === first.id),
);
const padded = source + " ".repeat(LIMIT - Buffer.byteLength(source));
for (const [body, status] of [
  [padded, 200],
  [padded + " ", 413],
]) {
  const r = await fetch(host + "/api/templates", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body,
  });
  assert.equal(r.status, status, await r.text());
}
console.log(
  "MCP tools, resource retrieval, D1 idempotency, visibility and upload boundaries passed.",
);
