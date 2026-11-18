import { Temporal } from "@js-temporal/polyfill"

export function formatScrapedDate(scrapedAt: string): string {
    return Temporal.Instant.from(scrapedAt).toZonedDateTimeISO("America/Denver").toPlainDate().toLocaleString("en-US", { month: "short", weekday: "short", day: "numeric" });
}

export function formatDate(dayKey: string): string {
    return Temporal.PlainDate.from(dayKey).toLocaleString("en-US", { month: "short", weekday: "short", day: "numeric" });
}

export function formatTime(timeString: string): string {
    return Temporal.PlainTime.from(timeString).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
}