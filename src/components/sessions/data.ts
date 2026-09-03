import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type TrackRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  sort_order: number;
};

export type ParticipantRow = {
  id: string;
  session_id: string;
  speaker_id: string | null;
  display_name: string | null;
  role: string;
  match_status: string;
  notes?: string | null;
  sort_order: number;
  speakers?: { id: string; full_name: string; phone: string | null; photo_url: string | null } | null;
};

export type SessionRow = {
  id: string;
  event_id: string | null;
  track_id: string | null;
  title_ar: string | null;
  title_en: string | null;
  session_type: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  time_precision?: string | null;
  exact_start_time?: string | null;
  duration_minutes: number | null;
  description: string | null;
  topic: string | null;
  status: string;
  notes: string | null;
  partner_text: string | null;
  session_participants: ParticipantRow[];
};

export function useTracks() {
  return useQuery({
    queryKey: ["sessions-tracks"],
    queryFn: async () => {
      const { data, error } = await db
        .from("session_tracks")
        .select("id, code, name_ar, name_en, sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TrackRow[];
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions-map"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("sessions")
        .select(
          "*, session_participants(id, session_id, speaker_id, display_name, role, match_status, sort_order, speakers(id, full_name, phone, photo_url))",
        )
        .order("session_date")
        .order("start_time");
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        ...s,
        session_participants: [...(s.session_participants ?? [])].sort(
          (a: ParticipantRow, b: ParticipantRow) => a.sort_order - b.sort_order,
        ),
      })) as SessionRow[];
    },
  });
}

export type SpeakerOps = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string | null;
  hotel: string | null;
  room: string | null;
};

export function useSpeakerOps() {
  return useQuery({
    queryKey: ["sessions-speaker-ops"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [speakers, ops, bookings] = await Promise.all([
        db.from("speakers").select("id, full_name, phone").order("full_name"),
        db.from("guest_operations").select("speaker_id, operational_status"),
        db.from("hotel_bookings").select("speaker_id, room_number, hotels(name)"),
      ]);
      if (speakers.error) throw speakers.error;
      const opsMap = new Map<string, string>();
      for (const row of ops.data ?? []) opsMap.set(row.speaker_id, row.operational_status);
      const hotelMap = new Map<string, { hotel: string | null; room: string | null }>();
      for (const row of bookings.data ?? [])
        if (row.speaker_id)
          hotelMap.set(row.speaker_id, {
            hotel: row.hotels?.name ?? null,
            room: row.room_number ?? null,
          });
      const map = new Map<string, SpeakerOps>();
      for (const s of speakers.data ?? []) {
        map.set(s.id, {
          id: s.id,
          full_name: s.full_name,
          phone: s.phone ?? null,
          status: opsMap.get(s.id) ?? null,
          hotel: hotelMap.get(s.id)?.hotel ?? null,
          room: hotelMap.get(s.id)?.room ?? null,
        });
      }
      return map;
    },
  });
}

export function useSpeakersList() {
  return useQuery({
    queryKey: ["sessions-speakers-list"],
    queryFn: async () => {
      const { data, error } = await db.from("speakers").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
}

export async function logSessionChange(
  sessionId: string,
  action: string,
  details: Record<string, unknown>,
) {
  const { data } = await supabase.auth.getUser();
  await db.from("activity_logs").insert({
    user_id: data.user?.id ?? null,
    entity_type: "sessions",
    entity_id: sessionId,
    action,
    details,
  });
}
