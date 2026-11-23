import { generateRoad } from "../../road.js";
export function onRequestGet({ request }) {
  try {
    const q = new URL(request.url).searchParams;
    const file = generateRoad(JSON.parse(q.get("spec")));
    if (q.get("format") === "png")
      return new Response(
        Uint8Array.from(atob(file.image.dataUrl.split(",")[1]), (c) =>
          c.charCodeAt(0),
        ),
        { headers: { "Content-Type": "image/png" } },
      );
    return Response.json(file, {
      headers: { "Content-Disposition": 'attachment; filename="road.wplace"' },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
