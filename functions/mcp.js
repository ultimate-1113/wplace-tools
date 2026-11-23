import {
  McpServer,
  createMcpHandler,
  ResourceTemplate,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import * as core from "../utils.js";
import { generateRoad } from "../road.js";
import { palette } from "../palette.js";
import { catalog, get, share } from "../server/storage.js";
const point = (url) => {
  const { lat, lng } = core.parseWplaceURL(url);
  return core.llzToWorldPixel(lat, lng);
};
function instant(s) {
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)?$/.test(
      s,
    )
  )
    throw Error("日時形式を確認してください");
  const calendar = new Date(s.slice(0, 16) + "Z");
  if (
    !Number.isFinite(+calendar) ||
    calendar.toISOString().slice(0, 16) !== s.slice(0, 16)
  )
    throw Error("存在しない日時です");
  const date = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(s) ? s : s + "+09:00");
  if (!Number.isFinite(+date)) throw Error("日時形式を確認してください");
  return date;
}
export function server(db, origin) {
  const m = new McpServer({ name: "wplace-road-tools", version: "1.0.0" });
  function tool(name, description, schema, run, readOnly = true) {
    m.registerTool(
      name,
      {
        description,
        inputSchema: z.object(schema),
        annotations: { readOnlyHint: readOnly },
      },
      async (input) => {
        try {
          const data = await run(input);
          return {
            structuredContent: data,
            content: [{ type: "text", text: JSON.stringify(data) }],
          };
        } catch (e) {
          return {
            isError: true,
            content: [{ type: "text", text: e.message }],
          };
        }
      },
    );
  }
  const url = z.string().url(),
    pair = { start: url, end: url };
  tool(
    "convert_map_url",
    "地図URL変換ツール",
    {
      url,
      mode: z.enum(["forward", "reverse"]).default("forward"),
      zoom: z.number().default(20),
    },
    (p) => ({
      urls:
        p.mode === "forward"
          ? [core.roadUrlToWplaceUrl(p.url, p.zoom || 20)]
          : core.wplaceUrlToRoadUrls(p.url, p.zoom || 20),
    }),
  );
  tool("url_to_coordinates", "URL座標変換ツール", { url }, (p) => {
    const v = point(p.url);
    return {
      ...v,
      worldX: Math.floor(v.worldX),
      worldY: Math.floor(v.worldY),
      raw: { x: v.worldX, y: v.worldY },
    };
  });
  tool(
    "plan_polyline",
    "折れ線プランナー",
    { ...pair, order: z.enum(["auto", "a-first", "b-first"]).default("auto") },
    (p) => {
      const xy = (url) => {
        const v = point(url);
        return { x: v.worldX, y: v.worldY };
      };
      const plan = core.planPolylineWorld(
        xy(p.start),
        xy(p.end),
        core.SLOPE_SET,
        { order: p.order },
      );
      return {
        ...plan,
        slopes: core.polylineSlopes(plan),
        links: plan.polylineWorld.map((v) => core.toWplaceURL(v.x, v.y, 18)),
        details: core.buildDebugText(plan),
      };
    },
  );
  tool(
    "calculate_paint",
    "ペイント量計算ツール",
    {
      ...pair,
      width: z.number().int().positive().default(5),
      overlap: z.union([z.literal(0), z.literal(1)]).default(1),
      crossDateline: z.boolean().optional(),
    },
    (p) => {
      const a = point(p.start),
        b = point(p.end);
      return {
        ...core.paintAmount(a, b, p.width, p.overlap, p.crossDateline),
        map: [a, b].map(core.summarizeMap),
      };
    },
  );
  tool(
    "estimate_finish",
    "完成予定日計算",
    {
      date1: z.string(),
      remaining1: z.number().int().nonnegative(),
      date2: z.string(),
      remaining2: z.number().int().nonnegative(),
    },
    (p) =>
      JSON.parse(
        JSON.stringify(
          core.calcFinishFromTwoPoints(
            instant(p.date1),
            p.remaining1,
            instant(p.date2),
            p.remaining2,
          ),
        ),
      ),
  );
  const swatch = z.enum(Object.values(palette));
  const road = {
    kind: z.enum(["circle", "arc", "clothoid"]),
    radius: z.number(),
    center: url.optional(),
    start: url.optional(),
    intersection: url.optional(),
    end: url.optional(),
    length: z.number().optional(),
    startAngle: z.number().optional(),
    endAngle: z.number().optional(),
    width: z.number().optional(),
    edge: z.number().optional(),
    overlap: z.number().optional(),
    color: swatch.optional(),
    edgeColor: swatch.optional(),
  };
  tool("generate_road", "道路作図・プレビュー・ダウンロード", road, (p) => {
    const file = generateRoad(p),
      spec = encodeURIComponent(JSON.stringify(p)),
      base = origin + "/api/road?spec=" + spec;
    return {
      width: file.image.width,
      height: file.image.height,
      bounds: file.bounds,
      preview: base + "&format=png",
      download: base,
      resources: ["png", "file"].map((f) => "road://drawing/" + f + "/" + spec),
    };
  });
  m.registerResource(
    "drawing",
    new ResourceTemplate("road://drawing/{format}/{spec}", { list: undefined }),
    {},
    async (uri, { format, spec }) => {
      const t = generateRoad(
        JSON.parse(
          typeof spec === "string" && spec.startsWith("{")
            ? spec
            : decodeURIComponent(spec),
        ),
      );
      return {
        contents: [
          format === "png"
            ? {
                uri: uri.href,
                mimeType: "image/png",
                blob: t.image.dataUrl.split(",")[1],
              }
            : {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(t),
              },
        ],
      };
    },
  );
  tool("list_templates", "公開テンプレート一覧（official は公式マーク）", {}, async () => ({
    templates: await catalog(db),
  }));
  m.registerResource(
    "shared-template",
    new ResourceTemplate("road://shared/{id}/{format}", { list: undefined }),
    {},
    async (uri, { id, format }) => {
      const source = await get(db, id);
      return {
        contents: [
          format === "png"
            ? {
                uri: uri.href,
                mimeType: "image/png",
                blob: JSON.parse(source).image.dataUrl.split(",")[1],
              }
            : { uri: uri.href, mimeType: "application/json", text: source },
        ],
      };
    },
  );
  tool(
    "get_template",
    "テンプレート取得",
    { id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/) },
    async (p) => ({
      source: await get(db, p.id),
      download: origin + "/api/templates/" + p.id,
      resources: ["png", "file"].map((f) => "road://shared/" + p.id + "/" + f),
    }),
  );
  tool(
    "upload_template",
    ".wplace を一覧に公開（UTF-8 で1,500,000バイトまで）",
    { source: z.string(), requestKey: z.string().min(16).max(128) },
    async (p) => {
      const id = await share(db, p.source, p.requestKey, true);
      return { id, url: origin + "/junctionTemplates?id=" + id };
    },
    false,
  );
  tool(
    "share_template",
    "共有リンクを発行",
    { source: z.string(), requestKey: z.string().min(16).max(128) },
    async (p) => {
      const id = await share(db, p.source, p.requestKey);
      return { id, url: origin + "/junctionTemplates?id=" + id };
    },
    false,
  );
  return m;
}
export function onRequest({ request, env }) {
  const origin = new URL(request.url).origin;
  if (request.headers.has("Origin") && request.headers.get("Origin") !== origin)
    return new Response(null, { status: 403 });
  return createMcpHandler(() => server(env.DB, origin)).fetch(request);
}
