// Single source of truth for action-status presentation.
// Colors live in globals.css (.status-* / .txt-* utilities) so tone is tokenized,
// not hardcoded per component. Import these instead of re-declaring maps.

export const STATUS_LABEL: Record<string, string> = {
  open: "Terbuka",
  in_progress: "Berjalan",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

// chip variant (bg + border + text)
export const STATUS_CHIP: Record<string, string> = {
  open: "status-chip status-open",
  in_progress: "status-chip status-progress",
  done: "status-chip status-done",
  cancelled: "status-chip status-cancelled",
};

// text-only variant (color only)
export const STATUS_TXT: Record<string, string> = {
  open: "txt-open",
  in_progress: "txt-progress",
  done: "txt-done",
  cancelled: "txt-cancelled",
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;
export const statusChip = (s: string) => STATUS_CHIP[s] ?? STATUS_CHIP.cancelled;
export const statusTxt = (s: string) => STATUS_TXT[s] ?? STATUS_TXT.cancelled;
