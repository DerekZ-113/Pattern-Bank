// Current release notes for the What's New banner. Bump `id` when shipping a
// release worth announcing — the banner reappears once for everyone until
// dismissed (dismissal stores this id; see uiState.ts).
export interface WhatsNewContent {
  id: string;
  title: string;
  bullets: readonly string[];
}

export const WHATS_NEW: WhatsNewContent = {
  id: "2026-07-22",
  title: "New: smarter patterns & LeetCode history",
  bullets: [
    "Array & Math pattern tags, with the picker organized into Data Structures and Strategies",
    "Tap any problem title to open its details",
    "Sync LeetCode any time with the ↻ button in the header",
    "Earlier LeetCode activity — expand it below Done today",
  ],
};
