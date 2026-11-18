import { ACTIVITY_LABELS, RINK_LABELS } from "@ice-time/shared";
import { formatTime } from "../utils/dateTimeFormatter";

import type {Session } from "@ice-time/shared";

interface SessionRowProps {
    session: Session;
}

export default function SessionRow({ session }: SessionRowProps) {
    return (
        <li>
            <p>{formatTime(session.startTime)} - {formatTime(session.endTime)}</p>
            <p>{ACTIVITY_LABELS[session.activity]}</p>
            <p>Rink: {RINK_LABELS[session.rink]} - {session.surface && `Surface: ${session.surface}`}</p>
            <p>{session.capacity && `Free Spots: ${session.capacity.available}/${session.capacity.total}`}</p>
        </li>
    )
};