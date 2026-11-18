import SessionRow from "./SessionRow";
import { formatDate } from "../utils/dateTimeFormatter";

import type { Session } from "@ice-time/shared";

interface DayBlockProps {
    day: string;
    sessions: Session[];
}

export default function DayBlock({ day, sessions }: DayBlockProps) {
    return (
        <div>
            <h3>{formatDate(day)}</h3>
            <ul>
                {sessions.map((session) => (
                    <SessionRow key={session.id} session={session} />
                ))}
            </ul>
        </div>
    );
}