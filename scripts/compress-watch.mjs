#!/usr/bin/env node
/**
 * compress-watch.mjs
 * --------------------------------------------------------------------------
 * Vigila `_raw/` y, ante cada .glb/.gltf nuevo o modificado:
 *   1) INSPECCIONA el modelo (via API de @gltf-transform/core) y genera avisos
 *      sobre texturas de resolucion excesiva, geometria densa, texturas
 *      huerfanas y peso fuera de presupuesto.
 *   2) [LVL_] COLAPSA texturas ORM duplicadas: si un material tiene una
 *      occlusion que es una ORM real (nombre con "ORM") y ademas una
 *      metallicRoughness baked aparte, repunta la MR a la ORM y deja la baked
 *      huerfana para que `prune` la elimine. 1 textura en vez de 2.
 *   3) Lo COMPRIME a `models/` con un perfil segun el PREFIJO del archivo.
 *   4) Escribe un reporte Markdown en `logs/<nombre>.md`.
 *
 * Prefijos:
 *   LVL_<n>.glb   -> nivel/decorado   (preserva nombres de nodo: no join/flatten)
 *   CHAR_<n>.glb  -> personaje        (preserva rig: no join/prune/simplify)
 *   PROP_<n>.glb  -> mesh estatico    (agresivo)
 *
 * Texturas: normal/ORM -> UASTC, color/emissive -> ETC1S. Geometria: meshopt.
 *
 * Uso:
 *   node scripts/compress-watch.mjs           # watch (paralelo al dev)
 *   node scripts/compress-watch.mjs --once     # procesa lo existente y sale
 *
 * Requiere: KTX-Software (`toktx`) en el PATH, aparte de npm.
 *   https://github.com/KhronosGroup/KTX-Software/releases
 * --------------------------------------------------------------------------
 */

import { spawnSync, execSync } from "node:child_process";
import { existsSync, statSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename, resolve } from "node:path";
import chokidar from "chokidar";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

// ---- Configuracion -------------------------------------------------------

const ROOT = resolve(process.cwd());
const RAW_DIR = resolve(ROOT, "_raw");
const OUT_DIR = resolve(ROOT, "public/models");
const LOG_DIR = resolve(ROOT, "logs");
const ONCE = process.argv.includes("--once");

const GT = process.platform === "win32"
  ? join(ROOT, "node_modules", ".bin", "gltf-transform.cmd")
  : join(ROOT, "node_modules", ".bin", "gltf-transform");

// Umbrales de aviso (independientes del perfil; ajusta a tu gusto).
const WARN_TEX_RES  = 2048;     // textura con lado mayor a esto -> aviso
const WARN_MESH_TRIS = 150000;  // malla con mas triangulos que esto -> aviso

// Solo se colapsa MR->occlusion cuando el nombre de la occlusion casa esto.
// Asi tocamos las ORM reales (T_*_ORM) y NO las occlusion puras (_Occlusion),
// que no llevan roughness/metallic en G/B y romperian el material.
const ORM_NAME_PATTERN = /orm/i;

const UASTC_SLOTS = "{normalTexture,metallicRoughnessTexture,occlusionTexture}";
const ETC1S_SLOTS = "{baseColorTexture,emissiveTexture}";

// Slots PBR que three.js consume de forma nativa (para detectar huerfanas).
const PBR_SLOTS = [
  "baseColorTexture", "normalTexture",
  "metallicRoughnessTexture", "occlusionTexture", "emissiveTexture",
];

const PROFILES = {
  LVL: {
    label: "level", textureSize: 512, budgetMB: 20, collapseORM: true,
    structure: ["--compress","false","--texture-compress","false",
                "--join","false","--flatten","false","--simplify","false",
                "--weld","true","--prune","true","--instance","true"],
  },
  CHAR: {
    label: "character", textureSize: 512, budgetMB: 15, collapseORM: false,
    structure: ["--compress","false","--texture-compress","false",
                "--join","false","--flatten","false","--simplify","false",
                "--weld","false","--prune","false","--instance","false",
                "--resample","true"],
  },
  PROP: {
    label: "prop", textureSize: 512, budgetMB: 6, collapseORM: true,
    structure: ["--compress","false","--texture-compress","false"],
  },
};

function profileFor(file) {
  const name = basename(file);
  if (name.startsWith("LVL_"))  return PROFILES.LVL;
  if (name.startsWith("CHAR_")) return PROFILES.CHAR;
  if (name.startsWith("PROP_")) return PROFILES.PROP;
  return null;
}

const mb = (bytes) => bytes / 1e6;
const fmtMB = (bytes) => `${mb(bytes).toFixed(2)} MB`;

// ---- Inspeccion (lectura estructurada del GLB) ---------------------------

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

async function inspectAsset(inputPath) {
  const doc = await io.read(inputPath);
  const root = doc.getRoot();

  // Mapa textura -> Set(slots) recorriendo materiales.
  const slotMap = new Map();    // Texture -> Set<string>
  const referenced = new Set(); // texturas en algun slot PBR estandar
  for (const mat of root.listMaterials()) {
    const pairs = [
      ["baseColorTexture", mat.getBaseColorTexture()],
      ["normalTexture", mat.getNormalTexture()],
      ["metallicRoughnessTexture", mat.getMetallicRoughnessTexture()],
      ["occlusionTexture", mat.getOcclusionTexture()],
      ["emissiveTexture", mat.getEmissiveTexture()],
    ];
    for (const [slot, tex] of pairs) {
      if (!tex) continue;
      if (!slotMap.has(tex)) slotMap.set(tex, new Set());
      slotMap.get(tex).add(slot);
      if (PBR_SLOTS.includes(slot)) referenced.add(tex);
    }
  }

  const textures = root.listTextures().map((t) => {
    const [w, h] = t.getSize() ?? [0, 0];
    const bytes = t.getImage()?.byteLength ?? 0;
    const slots = [...(slotMap.get(t) ?? [])];
    return {
      name: t.getName() || "(sin nombre)",
      slots, w, h, bytes,
      orphan: !referenced.has(t) && slots.length === 0,
    };
  }).sort((a, b) => b.bytes - a.bytes);

  const meshes = root.listMeshes().map((m) => {
    let verts = 0, tris = 0;
    for (const p of m.listPrimitives()) {
      const pos = p.getAttribute("POSITION");
      verts += pos?.getCount() ?? 0;
      const ind = p.getIndices();
      tris += ind ? ind.getCount() / 3 : (pos?.getCount() ?? 0) / 3;
    }
    return { name: m.getName() || "(sin nombre)", verts, tris: Math.round(tris) };
  }).sort((a, b) => b.tris - a.tris);

  const texBytes = textures.reduce((s, t) => s + t.bytes, 0);
  const totalTris = meshes.reduce((s, m) => s + m.tris, 0);

  const warnings = [];
  for (const t of textures) {
    if (Math.max(t.w, t.h) > WARN_TEX_RES) {
      warnings.push(`Textura **${t.name}** a ${t.w}x${t.h} (${t.slots.join(", ") || "?"}) -- excede ${WARN_TEX_RES}px; se redimensionara, pero conviene bajarla en el export de UE5.`);
    }
  }
  for (const m of meshes) {
    if (m.tris > WARN_MESH_TRIS) {
      warnings.push(`Malla **${m.name}** con ${m.tris.toLocaleString()} triangulos -- supera ${WARN_MESH_TRIS.toLocaleString()}; valora un LOD o decimar en UE5.`);
    }
  }
  for (const t of textures) {
    if (t.orphan) {
      warnings.push(`Textura **${t.name}** no la referencia ningun material -- huerfana; \`prune\` deberia eliminarla.`);
    }
  }

  return { textures, meshes, texBytes, totalTris, warnings, doc };
}

// ---- Colapso de ORM duplicada --------------------------------------------
// Repunta metallicRoughness -> occlusion (la ORM) cuando son texturas distintas
// y la occlusion es una ORM real. Devuelve [nº colapsadas, lista de materiales].

function collapseORM(doc) {
  const collapsedMats = [];
  for (const mat of doc.getRoot().listMaterials()) {
    const occ = mat.getOcclusionTexture();
    const mr = mat.getMetallicRoughnessTexture();
    if (!occ || !mr || occ === mr) continue;          // ya comparten o falta una
    if (!ORM_NAME_PATTERN.test(occ.getName() || "")) continue; // solo ORM reales

    const occInfo = mat.getOcclusionTextureInfo();
    mat.setMetallicRoughnessTexture(occ);             // MR pasa a apuntar a la ORM
    const mrInfo = mat.getMetallicRoughnessTextureInfo();
    if (occInfo && mrInfo) mrInfo.setTexCoord(occInfo.getTexCoord());
    collapsedMats.push(`${mat.getName()} (${mr.getName()} -> ${occ.getName()})`);
  }
  return collapsedMats;
}

// ---- Reporte Markdown ----------------------------------------------------

function writeReport(name, profile, insp, sizes, collapsedMats) {
  const lines = [];
  lines.push(`# Reporte de compresion -- ${name}`);
  lines.push("");
  lines.push(`- **Fecha:** ${new Date().toISOString()}`);
  lines.push(`- **Perfil:** ${profile.label} (texturas -> ${profile.textureSize}px, presupuesto ${profile.budgetMB} MB)`);
  if (sizes) {
    lines.push(`- **Tamano:** ${fmtMB(sizes.inBytes)} -> ${fmtMB(sizes.outBytes)} (${sizes.secs}s)`);
    const over = mb(sizes.outBytes) > profile.budgetMB;
    lines.push(`- **Presupuesto:** ${over ? "EXCEDIDO" : "dentro"} (${mb(sizes.outBytes).toFixed(2)} / ${profile.budgetMB} MB)`);
  }
  lines.push(`- **Geometria:** ${insp.totalTris.toLocaleString()} triangulos -- **texturas (crudo):** ${fmtMB(insp.texBytes)}`);
  lines.push(`- **ORM colapsadas:** ${collapsedMats.length}`);
  lines.push("");

  lines.push(`## Avisos (${insp.warnings.length})`);
  if (insp.warnings.length === 0) lines.push("Sin avisos.");
  else for (const w of insp.warnings) lines.push(`- ${w}`);
  lines.push("");

  if (collapsedMats.length) {
    lines.push("## ORM colapsadas (MR redundante eliminada)");
    for (const c of collapsedMats) lines.push(`- ${c}`);
    lines.push("");
  }

  lines.push("## Texturas (por peso, antes de comprimir)");
  lines.push("| textura | slot | resolucion | peso |");
  lines.push("| --- | --- | --- | --- |");
  for (const t of insp.textures) {
    const flag = Math.max(t.w, t.h) > WARN_TEX_RES ? " (!)" : "";
    lines.push(`| ${t.name}${flag} | ${t.slots.join(", ") || "--"} | ${t.w}x${t.h} | ${fmtMB(t.bytes)} |`);
  }
  lines.push("");

  lines.push("## Meshes (por triangulos)");
  lines.push("| mesh | vertices | triangulos |");
  lines.push("| --- | --- | --- |");
  for (const m of insp.meshes) {
    const flag = m.tris > WARN_MESH_TRIS ? " (!)" : "";
    lines.push(`| ${m.name}${flag} | ${m.verts.toLocaleString()} | ${m.tris.toLocaleString()} |`);
  }
  lines.push("");

  const path = join(LOG_DIR, name.replace(/\.(glb|gltf)$/i, "") + ".md");
  writeFileSync(path, lines.join("\n"), "utf8");
  return path;
}

// ---- Ejecucion de un paso del CLI ---------------------------------------

function run(args, label) {
  const cmd = `"${GT}" ${args.map(a => /[\s{}]/.test(a) ? `"${a}"` : a).join(" ")}`;
  const r = spawnSync(cmd, { shell: true, stdio: ["ignore","pipe","pipe"], encoding: "utf8" });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || "").trim().split("\n").slice(-6).join("\n");
    throw new Error(`[${label}] gltf-transform salio con codigo ${r.status}\n${err}`);
  }
}

// ---- Pipeline completo de un archivo ------------------------------------

const inFlight = new Set();

async function compress(inputPath) {
  const name = basename(inputPath);
  if (inFlight.has(name)) return;
  const profile = profileFor(inputPath);
  if (!profile) {
    console.warn(`!  ${name}: sin prefijo LVL_/CHAR_/PROP_, lo ignoro.`);
    return;
  }

  const outName = name.replace(/\.gltf$/i, ".glb");
  const outPath = join(OUT_DIR, outName);

  if (existsSync(outPath) && statSync(outPath).mtimeMs >= statSync(inputPath).mtimeMs) {
    return;
  }

  inFlight.add(name);
  const tmp = mkdtempSync(join(tmpdir(), "fenix-gt-"));
  const s = (n) => join(tmp, `s${n}.glb`);
  const t0 = Date.now();
  console.log(`>> ${name}  [${profile.label}]  inspeccionando...`);

  try {
    // 1) Inspeccion + avisos por pantalla
    const insp = await inspectAsset(inputPath);
    const big = insp.textures.filter(t => Math.max(t.w, t.h) > WARN_TEX_RES).length;
    console.log(`   ${insp.textures.length} texturas (${big} >${WARN_TEX_RES}px, ${fmtMB(insp.texBytes)} crudo) -- ${insp.totalTris.toLocaleString()} triangulos`);
    for (const w of insp.warnings) console.log(`   ! ${w.replaceAll('**', "")}`);

    // 2) Colapso de ORM duplicada (solo si el perfil lo activa)
    let collapsedMats = [];
    let chainInput = inputPath;
    if (profile.collapseORM) {
      collapsedMats = collapseORM(insp.doc);
      if (collapsedMats.length) {
        chainInput = s(0);
        await io.write(s(0), insp.doc); // GLB intermedio con MR repuntada
        console.log(`   colapsadas ${collapsedMats.length} ORM+MR -> 1 textura (prune eliminara las baked)`);
      }
    }

    // 3) Compresion (la cadena de siempre). El --prune del optimize limpia las baked.
    console.log(`>> ${name}  comprimiendo...`);
    const ts = String(profile.textureSize);
    run(["optimize", chainInput, s(1), ...profile.structure], "estructura");
    run(["resize", s(1), s(2), "--width", ts, "--height", ts], "resize");
    run(["uastc", s(2), s(3), "--slots", UASTC_SLOTS, "--level", "2"], "uastc");
    run(["etc1s", s(3), s(4), "--slots", ETC1S_SLOTS, "--quality", "160"], "etc1s");
    run(["meshopt", s(4), outPath, "--level", "high"], "meshopt");

    // 4) Reporte
    const sizes = {
      inBytes: statSync(inputPath).size,
      outBytes: statSync(outPath).size,
      secs: ((Date.now() - t0) / 1000).toFixed(1),
    };
    const reportPath = writeReport(outName, profile, insp, sizes, collapsedMats);

    const over = mb(sizes.outBytes) > profile.budgetMB;
    console.log(`${over ? "!" : "OK"} ${outName}  ${fmtMB(sizes.inBytes)} -> ${fmtMB(sizes.outBytes)}  (${sizes.secs}s)${over ? `  [excede presupuesto de ${profile.budgetMB}MB]` : ""}`);
    console.log(`   reporte: ${reportPath}`);
  } catch (e) {
    console.error(`XX ${name}: ${e.message}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    inFlight.delete(name);
  }
}

// ---- Preflight + arranque -----------------------------------------------

function preflight() {
  if (!existsSync(GT)) {
    console.error("XX No encuentro gltf-transform. Hiciste npm install?");
    process.exit(1);
  }
  try {
    execSync("toktx --version", { stdio: "ignore" });
  } catch {
    console.warn("!  `toktx` (KTX-Software) no esta en el PATH. La conversion a KTX2 fallara.");
    console.warn("   Instalalo: https://github.com/KhronosGroup/KTX-Software/releases");
  }
  for (const d of [RAW_DIR, OUT_DIR, LOG_DIR]) if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

preflight();

function onFile(p) {
  if (!/\.(glb|gltf)$/i.test(p)) return;
  compress(p);
}

const watcher = chokidar.watch(RAW_DIR, {
  ignoreInitial: false,
  usePolling: process.env.FENIX_POLL === "1",
  awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
});

watcher
  .on("add",    onFile)
  .on("change", onFile)
  .on("ready", () => {
    if (ONCE) {
      const wait = setInterval(() => {
        if (inFlight.size === 0) { clearInterval(wait); watcher.close(); }
      }, 300);
    } else {
      console.log(`Vigilando ${RAW_DIR}  ->  ${OUT_DIR}   (reportes en ${LOG_DIR})`);
    }
  });
