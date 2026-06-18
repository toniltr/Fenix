import { Story } from "inkjs";
import type { StoryVars } from "@/types/story.js";

// Envuelve el Story de inkjs y le pone una fachada TIPADA encima.
// Es el DUEÑO del estado narrativo (hambre, deuda, bronca, animo).
export class StoryRunner {
  private story: Story;

  onText: (line: string) => void = () => {};
  onChoices: (choices: string[]) => void = () => {};

  constructor(inkJson: string) {
    this.story = new Story(inkJson);
  }

  // ---- external functions / observers (las usa el InkBridge) ----
  bindExternal(name: string, fn: (...args: any[]) => any, lookaheadSafe = false): void {
    this.story.BindExternalFunction(name, fn, lookaheadSafe);
  }
  observe(varName: keyof StoryVars, cb: (name: string, value: unknown) => void): void {
    this.story.ObserveVariable(varName as string, cb);
  }

  // ---- variables tipadas ----
  get<K extends keyof StoryVars>(key: K): StoryVars[K] {
    return this.story.variablesState[key as string] as StoryVars[K];
  }
  set<K extends keyof StoryVars>(key: K, value: StoryVars[K]): void {
    this.story.variablesState[key as string] = value as never;
  }

  // ---- flujo ----
  /** salta a un knot y vuelca su texto + opciones */
  goTo(path: string): void {
    this.story.ChoosePathString(path);
    this.flush();
  }
  choose(index: number): void {
    this.story.ChooseChoiceIndex(index);
    this.flush();
  }

  private flush(): void {
    const lines: string[] = [];
    while (this.story.canContinue) {
      const line = this.story.Continue();
      if (line && line.trim()) lines.push(line.trim());
    }
    this.onText(lines.join("\n"));
    this.onChoices(this.story.currentChoices.map((c) => c.text));
  }
}
