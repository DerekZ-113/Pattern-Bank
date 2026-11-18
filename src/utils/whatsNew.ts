// Current release notes for the What's New banner. Bump `id` when shipping a
// release worth announcing — the banner reappears once for everyone until
// dismissed (dismissal stores this id; see uiState.ts).
export interface WhatsNewContent {
  id: string;
  title: string;
  bullets: readonly string[];
}

export const WHATS_NEW: WhatsNewContent = {
  id: "2026-11-17",
  title: "New: a redesigned PatternBank",
  bullets: [
    "A new look across the app, in dark and light",
    "Today shows your daily goal as tiles, and each rating says when the problem returns",
    "All Problems is now Problems: a compact list you can sort and filter",
  ],
};
