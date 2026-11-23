import { parseTemplate } from "../template.js";
export function catalog(db) {
  return db
    .prepare("SELECT id,name,official FROM templates WHERE official=1 OR listed=1 ORDER BY official DESC,name,id")
    .all()
    .then((r) => r.results.map(row => ({ ...row, official: !!row.official })));
}
export async function get(db, id) {
  const row = await db
    .prepare("SELECT source FROM templates WHERE id=?")
    .bind(id)
    .first();
  if (!row)
    throw Object.assign(Error("テンプレートが見つかりません"), { status: 404 });
  return row.source;
}
export async function share(db, source, key, listed = false) {
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(key ?? ""))
    throw Error("再送キーを指定してください");
  const t = parseTemplate(source);
  if (t.name.length > 256) throw Error("名前は256文字以内で指定してください");
  const digest = await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode((listed ? "listed:" : "unlisted:") + source));
  const id = btoa(String.fromCharCode(...new Uint8Array(digest, 0, 12)))
    .replaceAll("+", "-").replaceAll("/", "_");
  // Only store a new body when the request key points to it; legacy retries keep their old IDs.
  const [, , result] = await db.batch([
    db.prepare(`INSERT INTO template_requests VALUES(?,COALESCE(
      (SELECT id FROM templates WHERE request_key=?),?)) ON CONFLICT(request_key) DO NOTHING`).bind(key, key, id),
    db.prepare(`INSERT INTO templates(id,request_key,name,source,listed)
      SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM template_requests WHERE request_key=? AND template_id=?)
      ON CONFLICT(id) DO NOTHING`).bind(id, ":" + id, t.name, source, Number(listed), key, id),
    db.prepare(`SELECT t.id,(t.source=? AND t.listed=?) AS matches
      FROM template_requests r JOIN templates t ON t.id=r.template_id WHERE r.request_key=?`)
      .bind(source, Number(listed), key),
  ]);
  const saved = result.results[0];
  if (!saved?.matches)
    throw Object.assign(Error("共有IDまたは再送キーの内容が異なります"), { status: 409 });
  return saved.id;
}
