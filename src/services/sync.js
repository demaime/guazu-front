import { getPendingResponses, removeDoc } from "@/services/db/outbox";
import { trackEvent } from "@/lib/analytics";

export async function syncPendingResponses() {
  const pending = await getPendingResponses();
  if (!pending || pending.length === 0) {
    return { synced: 0, total: 0 };
  }

  let synced = 0;
  for (const doc of pending) {
    try {
      const token = doc.authToken || localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/insert-answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(doc),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await removeDoc(doc._id);
      synced += 1;
    } catch {
      // corta ante primer error para intentar luego
      break;
    }
  }

  try {
    if (synced > 0) {
      trackEvent("offline_synced", {
        count: synced,
        total: pending.length,
      });
    }
  } catch {}

  return { synced, total: pending.length };
}
