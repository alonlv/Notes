/**
 * The messaging platforms the assistant can be reached on.
 *
 * One list, because every place that offers a platform choice must offer the same
 * ones — a picker that has drifted out of step with the backend's adapters is a
 * setting a person can save and then find does not work.
 *
 * ``value`` is what the API expects; ``label`` is only for display.
 */
export const PLATFORMS = [
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "slack", label: "Slack" },
  { value: "webex", label: "Webex" },
] as const;

/** The `<option>` set for a platform `<select>`. */
export function platformOptions() {
  return PLATFORMS.map((p) => (
    <option key={p.value} value={p.value}>
      {p.label}
    </option>
  ));
}
