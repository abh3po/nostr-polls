export const NOTIFICATION_MESSAGES = {
  // Clipboard operations
  POLL_URL_COPIED: "Poll URL copied to clipboard!",
  EVENT_COPIED: "Event copied to clipboard!",
  POLL_URL_COPY_FAILED: "Failed to copy poll URL.",
  EVENT_COPY_FAILED: "Failed to copy event.",

  // Authentication
  ANONYMOUS_LOGIN: "Login not found, submitting anonymously",

  // Validation errors
  INVALID_URL: "Invalid URL",
  INVALID_AMOUNT: "Invalid amount.",
  PAST_DATE_ERROR: "You cannot select a past date/time.",
  RECIPIENT_PROFILE_ERROR: "Could not fetch recipient profile",
  EMPTY_POLL_OPTIONS: "Poll options cannot be empty.",
  MIN_POLL_OPTIONS: "A poll must have at least one option.",

  // Poll operations
  POLL_NOT_FOUND: "Could not find the given poll",
  POLL_FETCH_ERROR: "Error fetching poll event.",

  // User actions
  LOGIN_TO_LIKE: "Login To Like!",
  LOGIN_TO_COMMENT: "Login To Comment",
  LOGIN_TO_ZAP: "Log In to send zaps!",
} as const;

export type NotificationMessageKey = keyof typeof NOTIFICATION_MESSAGES;
