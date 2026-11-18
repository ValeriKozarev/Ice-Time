import DayBlock from "./DayBlock";
import { formatScrapedDate } from "../utils/dateTimeFormatter";

import type { Session } from "@ice-time/shared";

interface WeekViewProps {
    scrapedAt: string;
    sessions: Session[];
}

// we want to generate a view that shows what sessions are available each day of the week, but our data is by rink so we need to massage it a little bit first
function groupByDay(sessions: Session[]): Record<string, Session[]> {
    // make a shallow copy and then sort it so that the days are in order
    const sortedSessions = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const byDay: Record<string, Session[]> = {};

    // build a map where each day holds a list of sessions
    for (const session of sortedSessions) {
        const dayKey = session.startTime.slice(0, 10);
        byDay[dayKey] ??= [];
        byDay[dayKey].push(session);
    }

    return byDay;
}

export default function WeekView({ scrapedAt, sessions }: WeekViewProps) {
    const sessionsByDay = groupByDay(sessions);

    return (
        <>
            <h1>Ice Time Report</h1>
            <p>{sessions.length} sessions found as of {formatScrapedDate(scrapedAt)}</p>

            {Object.entries(sessionsByDay).map(([day, sessions]) => 
                <DayBlock key={day} day={day} sessions={sessions} />)
            }
        </>
    );
}