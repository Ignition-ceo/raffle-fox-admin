/**
 * Global Search — searches across all Firestore collections
 *
 * Strategy: client-side filtering on recent docs (safe, no index required).
 * For exact lookups (email, ticket number), uses Firestore where() queries.
 *
 * Collections searched:
 *   raffles, prize_database, users, sponsors, admins,
 *   partners, image_library, raffle_tickets
 */

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query as fsQuery,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Types ──

export interface GlobalSearchResult {
  type: "game" | "prize" | "user" | "sponsor" | "admin" | "partner" | "image" | "ticket";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

// ── Helpers ──

function norm(s: string) {
  return (s || "").trim();
}
function lower(s: string) {
  return norm(s).toLowerCase();
}
function isEmail(s: string) {
  return s.includes("@");
}
function digits(s: string) {
  return s.replace(/\D/g, "");
}

function push(results: GlobalSearchResult[], r: GlobalSearchResult | null) {
  if (r) results.push(r);
}

/** Fetch recent docs from a collection. Falls back to unordered if orderBy fails. */
async function recentDocs(colName: string, take: number, orderField?: string) {
  const ref = collection(db, colName);
  try {
    if (orderField) {
      return await getDocs(fsQuery(ref, orderBy(orderField, "desc"), limit(take)));
    }
  } catch {
    // orderBy field may not exist on all docs
  }
  return await getDocs(fsQuery(ref, limit(take)));
}

/** Match query against multiple fields on a doc */
function matchesAny(doc: any, fields: string[], q: string): boolean {
  return fields.some((f) => (doc[f] || "").toString().toLowerCase().includes(q));
}

// ── Main Search ──

export async function globalSearch(raw: string): Promise<GlobalSearchResult[]> {
  const q = norm(raw);
  if (q.length < 2) return [];

  const ql = lower(q);
  const qd = digits(q);
  const results: GlobalSearchResult[] = [];

  // Run all searches in parallel for speed
  await Promise.allSettled([
    // ── RAFFLES / GAMES ──
    (async () => {
      try {
        const snap = await recentDocs("raffles", 100, "createdAt");
        snap.forEach((d) => {
          const r = d.data();
          if (matchesAny(r, ["title", "description", "category", "gameCategory", "raffleCode"], ql)) {
            push(results, {
              type: "game",
              id: d.id,
              label: r.title || "Untitled Game",
              sublabel: r.status || "Active",
              href: `/games`,
            });
          }
        });
      } catch (e) { console.warn("[search] raffles failed", e); }
    })(),

    // ── PRIZE DATABASE ──
    (async () => {
      try {
        const snap = await recentDocs("prize_database", 100, "createdAt");
        snap.forEach((d) => {
          const p = d.data();
          if (matchesAny(p, ["prizeName", "fullDescription", "tags", "prizeCategory"], ql)) {
            push(results, {
              type: "prize",
              id: d.id,
              label: p.prizeName || "Prize",
              sublabel: p.retailValueUSD ? `$${p.retailValueUSD}` : p.prizeCategory || undefined,
              href: `/prizes`,
            });
          }
        });
      } catch (e) { console.warn("[search] prize_database failed", e); }
    })(),

    // ── USERS / GAMERS ──
    (async () => {
      try {
        // Email exact match (fast)
        if (isEmail(ql)) {
          const snap = await getDocs(
            fsQuery(collection(db, "users"), where("email", "==", ql), limit(5))
          );
          snap.forEach((d) => {
            const u = d.data();
            push(results, {
              type: "user",
              id: d.id,
              label: u.userName || u.name || u.email || "User",
              sublabel: u.email,
              href: `/gamers`,
            });
          });
        }

        // Contains search — no orderBy (safest, works even without indexes)
        const snap = await getDocs(fsQuery(collection(db, "users"), limit(200)));
        snap.forEach((d) => {
          const u = d.data();
          if (matchesAny(u, ["userName", "name", "email", "phone", "displayName"], ql)) {
            push(results, {
              type: "user",
              id: d.id,
              label: u.userName || u.name || u.displayName || u.email || "User",
              sublabel: u.email,
              href: `/gamers`,
            });
          }
        });
      } catch (e) { console.warn("[search] users failed", e); }
    })(),

    // ── SPONSORS ──
    (async () => {
      try {
        const snap = await recentDocs("sponsors", 50, "createdAt");
        snap.forEach((d) => {
          const s = d.data();
          if (matchesAny(s, ["sponsorName", "name", "website"], ql)) {
            push(results, {
              type: "sponsor",
              id: d.id,
              label: s.sponsorName || s.name || "Sponsor",
              sublabel: s.website || undefined,
              href: `/sponsors`,
            });
          }
        });
      } catch (e) { console.warn("[search] sponsors failed", e); }
    })(),

    // ── ADMINS ──
    (async () => {
      try {
        const snap = await recentDocs("admins", 50, "createdAt");
        snap.forEach((d) => {
          const a = d.data();
          if (matchesAny(a, ["fullName", "name", "email", "company"], ql)) {
            push(results, {
              type: "admin",
              id: d.id,
              label: a.fullName || a.name || a.email || "Admin",
              sublabel: a.role || a.email || undefined,
              href: `/admins`,
            });
          }
        });
      } catch (e) { console.warn("[search] admins failed", e); }
    })(),

    // ── PARTNERS ──
    (async () => {
      try {
        if (isEmail(ql)) {
          const snap = await getDocs(
            fsQuery(collection(db, "partners"), where("email", "==", ql), limit(5))
          );
          snap.forEach((d) => {
            const p = d.data();
            push(results, {
              type: "partner",
              id: d.id,
              label: p.name || p.email || "Partner",
              sublabel: p.email,
              href: `/partners`,
            });
          });
        }

        const snap = await recentDocs("partners", 75, "createdAt");
        snap.forEach((d) => {
          const p = d.data();
          if (matchesAny(p, ["name", "email", "company", "userType"], ql)) {
            push(results, {
              type: "partner",
              id: d.id,
              label: p.name || p.email || "Partner",
              sublabel: p.email || p.company || undefined,
              href: `/partners`,
            });
          }
        });
      } catch (e) { console.warn("[search] partners failed", e); }
    })(),

    // ── GAME IMAGES ──
    (async () => {
      try {
        const snap = await recentDocs("image_library", 50, "createdAt");
        snap.forEach((d) => {
          const img = d.data();
          if (matchesAny(img, ["title", "name", "gameCategory", "category"], ql)) {
            push(results, {
              type: "image",
              id: d.id,
              label: img.title || img.name || "Image",
              sublabel: img.gameCategory || img.category || undefined,
              href: `/game-images`,
            });
          }
        });
      } catch (e) { console.warn("[search] image_library failed", e); }
    })(),

    // ── RAFFLE TICKETS (exact lookups only) ──
    (async () => {
      try {
        if (qd.length >= 3) {
          // ticketNumber as string
          const snap1 = await getDocs(
            fsQuery(collection(db, "raffle_tickets"), where("ticketNumber", "==", qd), limit(5))
          );
          snap1.forEach((d) => {
            const t = d.data();
            push(results, {
              type: "ticket",
              id: d.id,
              label: `Ticket #${t.ticketNumber || d.id}`,
              sublabel: t.orderId ? `Order ${t.orderId}` : undefined,
              href: `/games`,
            });
          });

          // ticketNumber as number
          const n = Number(qd);
          if (!isNaN(n)) {
            const snap2 = await getDocs(
              fsQuery(collection(db, "raffle_tickets"), where("ticketNumber", "==", n), limit(5))
            );
            snap2.forEach((d) => {
              const t = d.data();
              push(results, {
                type: "ticket",
                id: d.id,
                label: `Ticket #${t.ticketNumber || d.id}`,
                sublabel: t.orderId ? `Order ${t.orderId}` : undefined,
                href: `/games`,
              });
            });
          }
        }

        // orderId exact
        if (q.length >= 6) {
          const snap = await getDocs(
            fsQuery(collection(db, "raffle_tickets"), where("orderId", "==", q), limit(5))
          );
          snap.forEach((d) => {
            const t = d.data();
            push(results, {
              type: "ticket",
              id: d.id,
              label: `Order ${t.orderId || q}`,
              sublabel: t.ticketNumber ? `Ticket #${t.ticketNumber}` : undefined,
              href: `/games`,
            });
          });
        }
      } catch (e) { console.warn("[search] raffle_tickets failed", e); }
    })(),
  ]);

  // Deduplicate by type+id
  const seen = new Set<string>();
  return results
    .filter((r) => {
      const key = `${r.type}:${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15);
}
