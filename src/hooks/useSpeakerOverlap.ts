import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * تطبيع محافظ للأسماء العربية للمقارنة فقط — لا يغيّر أي بيانات.
 * يزيل التشكيل والألقاب الشائعة ويوحّد صور الحروف المتشابهة.
 */
export function normalizeArabicName(name: string | null | undefined): string {
  let n = (name ?? "").trim().toLowerCase();
  // إزالة التشكيل والتطويل
  n = n.replace(/[ً-ْٰـ]/g, "");
  // توحيد الألف والياء والتاء المربوطة والهمزات
  n = n.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
  n = n.replace(/ؤ/g, "و").replace(/ئ/g, "ي");
  // إزالة علامات الترقيم
  n = n.replace(/[.,،؛:()\-_/\\'"`]/g, " ");
  // إزالة الألقاب الشائعة في بداية الاسم (قد تتكرر)
  const titles = /^(د|أ|ا|م|الدكتور|الاستاذ|الأستاذ|المهندس|الشيخ|معالي|سعادة|الأستاذه|الاستاذة|برف|بروف|البروفيسور)$/i;
  let parts = n.split(/\s+/).filter(Boolean);
  while (parts.length > 1 && titles.test(parts[0])) parts = parts.slice(1);
  n = parts.join(" ");
  return n.trim();
}

/**
 * يجلب أسماء المتحدثين ويعيد مجموعة أسماء مطبّعة للكشف عن التداخل
 * مع قوائم أخرى (مثل المدعوين) دون أي تعديل على البيانات.
 */
export function useSpeakerOverlap() {
  const speakersQuery = useQuery({
    queryKey: ["speaker-overlap-names"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("speakers")
        .select("full_name");
      if (error) throw error;
      return (data ?? []) as { full_name: string }[];
    },
  });

  const speakerNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of speakersQuery.data ?? []) {
      const norm = normalizeArabicName(s.full_name);
      if (norm) set.add(norm);
    }
    return set;
  }, [speakersQuery.data]);

  const isSpeaker = (name: string | null | undefined) => {
    const norm = normalizeArabicName(name);
    return norm ? speakerNames.has(norm) : false;
  };

  return { speakerNames, isSpeaker, loading: speakersQuery.isLoading };
}
