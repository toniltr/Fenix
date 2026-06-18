// Pinta texto + opciones en el DOM. ink NO dibuja: esto sí.
export class DialogueUI {
  private root = document.getElementById("dialogue")!;
  private textEl = document.getElementById("dialogue-text")!;
  private choicesEl = document.getElementById("dialogue-choices")!;

  onChoice: (index: number) => void = () => {};

  showText(text: string): void {
    this.textEl.textContent = text;
    if (text) this.root.classList.add("show");
  }

  showChoices(choices: string[]): void {
    this.choicesEl.innerHTML = "";
    if (choices.length === 0) {
      // sin opciones -> fin del nodo: cerrar tras un momento
      if (this.textEl.textContent) {
        setTimeout(() => this.hide(), 1600);
      }
      return;
    }
    choices.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.addEventListener("click", () => this.onChoice(i));
      this.choicesEl.appendChild(btn);
    });
  }

  hide(): void {
    this.root.classList.remove("show");
    this.choicesEl.innerHTML = "";
    this.textEl.textContent = "";
  }
}
