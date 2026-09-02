// Current release notes for the What's New banner. Bump `id` when shipping a
// release worth announcing — the banner reappears once for everyone until
// dismissed (dismissal stores this id; see uiState.ts).
export interface WhatsNewContent {
  id: string;
  title: string;
  bullets: readonly string[];
}

export const WHATS_NEW: WhatsNewContent = {
  id: "2026-09-01",
  title: "New: review from All Problems & a Database tag",
  bullets: [
    "Review due problems right from All Problems — every rating counts toward your goal, streak, and Done today",
    "Database is now an opt-in pattern — enable it under Settings › Additional Patterns",
    "Star ratings start empty until you pick one, everywhere",
  ],
};
