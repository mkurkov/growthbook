export type EventWebHookPayloadType = "raw" | "slack" | "discord" | "ms-teams";

export const eventWebHookPayloadType = [
  "raw",
  "slack",
  "discord",
  "ms-teams",
] as const;
