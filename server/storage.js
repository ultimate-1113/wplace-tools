import { parseTemplate } from "../template.js";
export function catalog(db) {
  return db
    .prepare("SELECT id,name FROM templates WHERE official=1 ORDER BY name,id")
    .all()
    .then((r) => r.results);
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
export async function share(db, source, key) {
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(key ?? ""))
    throw Error("再送キーを指定してください");
  const t = parseTemplate(source);
  if (t.name.length > 256) throw Error("名前は256文字以内で指定してください");
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO templates(id,request_key,name,source) VALUES(?,?,?,?) ON CONFLICT(request_key) DO NOTHING",
    )
    .bind(id, key, t.name, source)
    .run();
  const saved = await db
    .prepare("SELECT id,source=? AS matches FROM templates WHERE request_key=?")
    .bind(source, key)
    .first();
  if (!saved.matches)
    throw Object.assign(Error("再送キーの内容が異なります"), { status: 409 });
  return saved.id;
}
