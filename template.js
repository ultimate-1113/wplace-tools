export const LIMIT = 1500000;
export function parseTemplate(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > LIMIT)
    throw Error("アップロード上限は1.5 MBです");
  const t = JSON.parse(text);
  if (
    t?.schemaVersion !== "1" ||
    typeof t.name !== "string" ||
    !Number.isInteger(t.image?.width) ||
    t.image.width <= 0 ||
    !Number.isInteger(t.image.height) ||
    t.image.height <= 0 ||
    !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(
      t.image.dataUrl,
    ) ||
    !["north", "west", "south", "east"].every((k) =>
      Number.isFinite(t.bounds?.[k]),
    )
  )
    throw Error(".wplace 形式を確認してください");
  const encoded = t.image.dataUrl.slice("data:image/png;base64,".length);
  const bytes = atob(encoded);
  const word = (offset) =>
    bytes.charCodeAt(offset) * 0x1000000 + bytes.charCodeAt(offset + 1) * 0x10000 +
    bytes.charCodeAt(offset + 2) * 256 + bytes.charCodeAt(offset + 3);
  if (bytes.length < 45 || word(8) !== 13 || bytes.slice(12, 16) !== "IHDR" ||
      !word(16) || !word(20) || bytes.slice(-8, -4) !== "IEND")
    throw Error("PNG画像を確認してください");
  return t;
}
