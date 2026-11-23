import { build } from "esbuild";
import {
  mkdir,
  readdir,
  copyFile,
  writeFile,
  readFile,
} from "node:fs/promises";
import { gzipSync } from "node:zlib";
const pages = (await readdir(".")).filter((n) => n.endsWith(".html"));
await mkdir("dist", { recursive: true });
await build({
  entryPoints: [...pages.map((n) => n.replace(".html", ".js")), "style.css"],
  bundle: true,
  minify: true,
  outdir: "dist",
  format: "esm",
  target: "es2022",
});
for (const file of [...pages, "sitemap.xml"])
  await copyFile(file, "dist/" + file);
await writeFile(
  "dist/_routes.json",
  JSON.stringify({
    version: 1,
    include: ["/api/*", "/mcp", "/mcp/"],
    exclude: [],
  }),
);
const limits = {
  index: 6000,
  ConvertUrl: 11988,
  finishPaint: 11017,
  paintCalc: 11698,
  planPolyline: 11609,
  urlCoordinates: 10797,
};
for (const [name, max] of Object.entries(limits)) {
  let bytes = 0;
  for (const file of [name + ".html", name + ".js", "style.css"])
    bytes += gzipSync(await readFile("dist/" + file), { level: 9 }).length;
  console.log(name, bytes, "B gzip");
  if (bytes > max) throw Error(name + " exceeds " + max);
}
