// Compila ink/fenix.ink -> public/story/fenix.ink.json usando el compilador de inkjs.
// (igual que optimizas GLTF en build, esto compila la historia.)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SRC = "ink/fenix.ink";
const OUT = "public/story/fenix.ink.json";

const { Compiler } = await import("inkjs/full");

const inkText = readFileSync(SRC, "utf8");
const story = new Compiler(inkText).Compile();
const json = story.ToJson();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json ?? "", "utf8");
console.log(`✓ ${SRC} -> ${OUT}`);
