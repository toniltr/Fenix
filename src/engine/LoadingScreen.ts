const HIDE_DURATION_MS = 250;

export const LoadingScreen = {
  show(roomName?: string): void {
    const el = document.getElementById("loading-screen")!;
    const label = document.getElementById("loading-room-name")!;
    label.textContent = roomName ?? "Viajando…";
    el.removeAttribute("aria-hidden");
    el.classList.add("visible");
  },

  hide(): Promise<void> {
    const el = document.getElementById("loading-screen")!;
    el.classList.remove("visible");
    el.setAttribute("aria-hidden", "true");
    return new Promise((res) => setTimeout(res, HIDE_DURATION_MS));
  },
};
