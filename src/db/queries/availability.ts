import "server-only";

import { db } from "@/db";
import { sql } from "drizzle-orm";

const STUDIO_TZ = "America/New_York";

export type Gap = { start: Date; end: Date };

function parseMultirange(raw: string): Gap[] {
  const matches = raw.matchAll(/\["([^"]+)","([^"]+)"\)/g);
  return Array.from(matches, (m) => ({
    start: new Date(m[1]),
    end: new Date(m[2]),
  }));
}

export async function getAvailability(
  artistId: string,
  date: string,
  durationMinutes: number,
): Promise<Gap[]> {
  const result = await db.execute(sql`
    WITH the_day AS (
      SELECT tstzrange(
        (${date}::date + wh.start_time) AT TIME ZONE ${STUDIO_TZ},
        (${date}::date + wh.end_time)   AT TIME ZONE ${STUDIO_TZ}
      ) AS shift
      FROM working_hours wh
      WHERE wh.artist_id = ${artistId}
        AND wh.day_of_week = EXTRACT(DOW FROM ${date}::date)
    ),
    blocked AS (
      SELECT during FROM sessions
        WHERE artist_id = ${artistId}
          AND during && (SELECT shift FROM the_day)
      UNION ALL
      SELECT during FROM time_off
        WHERE artist_id = ${artistId}
          AND during && (SELECT shift FROM the_day)
    )
    SELECT
        tstzmultirange((SELECT shift FROM the_day))
        - COALESCE(
            (SELECT range_agg(during) FROM blocked),
            '{}'::tstzmultirange
          ) AS gaps;
  `);

  const raw = result[0]?.gaps as string | null;
  if (!raw) return [];

  return parseMultirange(raw).filter(
    (g) => (g.end.getTime() - g.start.getTime()) / 60000 >= durationMinutes,
  );
}
