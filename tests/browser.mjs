// Run against "wrangler pages dev" with the local D1 migration applied.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:8788";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({timezoneId:"Asia/Tokyo"});
  async function tool(name,args){
    const r=await fetch(origin+"/mcp",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/event-stream"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name,arguments:args}})});
    const text=await r.text(), rpc=JSON.parse(text.startsWith("event:")?text.split("data: ")[1].split("\n")[0]:text);
    assert.ok(!rpc.result.isError);return rpc.result.structuredContent;
  }
  await page.route(/^https:\/\//, (route) => route.abort());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const coordinates = "https://wplace.live/?lat=0&lng=0";
  for (const [width, colorScheme] of [
    [360, "light"],
    [360, "dark"],
    [1024, "light"],
    [1024, "dark"],
  ]) {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme });
    for (const path of [
      "/",
      "/ConvertUrl",
      "/urlCoordinates",
      "/planPolyline",
      "/paintCalc",
      "/finishPaint",
      "/roadDesign",
      "/junctionTemplates",
    ]) {
      await page.goto(origin + path);
      if (width === 360 && colorScheme === "light" && !["/roadDesign","/junctionTemplates"].includes(path)) {
        const filename=(path.slice(1)||"index")+".html";
        const original=execFileSync("git",["show","575bf68:"+filename],{encoding:"utf8"});
        const [before,after]=await page.evaluate(html=>{
          function strings(doc){
            const body=doc.body.cloneNode(true);
            body.querySelectorAll("script").forEach(node=>node.remove());
            body.querySelectorAll('a[href="./roadDesign"],a[href="./junctionTemplates"]').forEach(node=>(node.closest("li,.tool-item")||node).remove());
            return [doc.title,body.textContent.replace(/\s+/g," ").trim(),...Array.from(body.querySelectorAll("input"),node=>node.placeholder)];
          }
          return [strings(new DOMParser().parseFromString(html,"text/html")),strings(document)];
        },original);
        assert.deepEqual(after,before,filename);
      }
      await page.click("#menuBtn");
      assert.ok(await page.isVisible("#menuPanel"));
      await page.keyboard.press("Escape");
      assert.equal(await page.isVisible("#menuPanel"), false);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    await page.goto(origin + "/urlCoordinates");
    await page.fill("#urlInput", coordinates);
    await page.click("[type=submit]");
    assert.equal(await page.textContent("#worldCoord"), "(1024000, 1024000)");
    await page.goto(origin + "/planPolyline");
    await page.fill("#startUrlInput", coordinates);
    await page.fill("#endUrlInput", coordinates);
    await page.click("[type=submit]");
    assert.equal(await page.textContent("#bendLocal"), "—");
    assert.equal(await page.isVisible("#bendLink"), false);
  }
  await page.goto(origin+"/ConvertUrl");
  const india="https://wplace.live/?lat=0&lng=70";
  await page.selectOption("#modeSelect","reverse");await page.fill("#urlInput",india);await page.click("[type=submit]");
  const {urls}=await tool("convert_map_url",{url:india,mode:"reverse"});
  assert.equal(urls.length,2);
  for(let i=0;i<2;i++)assert.equal(await page.getAttribute("#outputLink"+(i+1),"href"),urls[i]);
  await page.goto(origin+"/paintCalc");
  const start="https://wplace.live/?lat=2&lng=179",end="https://wplace.live/?lat=0&lng=-179";
  await page.fill("#startUrlInput",start);await page.fill("#endUrlInput",end);
  for(const wrap of [true,false]){
    page.once("dialog",d=>wrap?d.accept():d.dismiss());
    await page.click("[type=submit]");
    const calc=await tool("calculate_paint",{start,end,crossDateline:wrap});
    assert.equal(await page.textContent("#requiredPx"),calc.requiredPx+" px");
  }
  await page.goto(origin+"/finishPaint");
  const dates={date1:"2026-04-01T13:00",date2:"2026-04-01T12:00",remaining1:60,remaining2:120};
  await page.fill("#dt1",dates.date1);await page.fill("#dt2",dates.date2);await page.fill("#rem1","60");await page.fill("#rem2","120");await page.click("[type=submit]");
  const finish=await tool("estimate_finish",dates);
  assert.equal(finish.finishDate,"2026-04-01T05:00:00.000Z");assert.equal(await page.textContent("#outFinish"),"2026/04/01 14:00");
  await page.goto(origin + "/roadDesign");
  await page.fill("#center", coordinates);
  await page.click("#road button");
  await page.locator("#preview").waitFor();
  assert.ok(
    await page.locator("#preview").evaluate(async (img) => {
      await img.decode();
      return img.naturalWidth === 105;
    }),
  );
  await page.click("#share");
  await page.waitForSelector("#shared[href]");
  const link = await page.getAttribute("#shared", "href");
  await page.goto(new URL(link, origin).href);
  await page.locator("#preview").waitFor();
  assert.equal(await page.locator("#catalog a").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Eight routes, light/mobile and dark/desktop, menu, coordinates, polyline, native PNG, D1 share and retrieval passed.",
  );
} finally {
  await browser.close();
}
