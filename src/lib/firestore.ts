/**
 * Raffle Fox Admin — Real-time Firestore Service Layer
 *
 * Every collection uses two patterns:
 *   1. get*()       — one-shot fetch (for initial loads, SSR, etc.)
 *   2. on*Change()  — real-time onSnapshot listener (returns unsubscribe fn)
 *
 * Collections covered:
 *   prize_database, raffles, raffle_tickets (revenue), sponsors,
 *   users, admins, notification_settings, game_images/image_library, partners
 */

import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  where,
  Timestamp,
  setDoc,
  getCountFromServer,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  type Unsubscribe,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

// ═══════════════════════════════════════
//  Types
// ═══════════════════════════════════════

export interface Prize {
  id: string;
  prizeName: string;
  keyDetails?: string;
  shortDescription?: string;
  quantityAvailable?: string;
  fullDescription?: string;
  prizeValue?: number;
  retailValueUSD?: string;
  breakEvenValue?: number;
  sponsorId?: string;
  sponsorName?: string;
  stockLevel?: number;
  status: string;
  thumbnail?: string;
  images?: string[];
  tags?: string;
  keywords?: string[];
  prizeCategory?: string;
  fulfillmentMethod?: string;
  deliveryTimeline?: string;
  claimWindow?: string;
  pickupRequired?: boolean;
  eligibleRegions?: string;
  ageRestriction?: string;
  idRequired?: boolean;
  termsConditionsUrl?: string;
  useStandardTerms?: boolean;
  customTermsUrl?: string;
  customTermsType?: string;
  stockDate?: string;
  additionalInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Raffle {
  id: string;
  title: string;
  description: string;
  picture: string;
  editedGamePicture?: string;
  prizeId: string;
  prizeName?: string;
  prizeImage?: string;
  sponsorId?: string;
  sponsorName?: string;
  ticketSold: number;
  ticketsSold?: number;
  ticketPrice: number;
  category?: string;
  gameCategory?: string;
  gameDescription?: string;
  startTime?: string;
  endTime?: string;
  createdAt: Date;
  expiryDate: Date;
  status: string;
  computedStatus: string;
  updatedAt: Date;
}

export interface Sponsor {
  id: string;
  sponsorName: string;
  name: string;
  logo: string[];
  logoUrl: string;
  website?: string;
  status: string;
  gamesCreation: string[];
  prizesCreation: string[];
  createdAt: Date;
}

export interface GamerUser {
  id: string;
  uid?: string;
  userName?: string;
  name: string;
  email: string;
  access?: string;
  registrationDate: Date;
  status: string;
  kycRequest?: string;
  isBanned?: boolean;
  thumbnail?: string;
  profilePicture?: string;
}

export interface Admin {
  id: string;
  uid: string;
  email: string;
  fullName?: string;
  name: string;
  company: string;
  role: string;
  phoneNumber?: string;
  phone?: string;
  profilePicture?: string;
  status: string;
  createdAt: Date;
}

export interface GameImage {
  id: string;
  title: string;
  name?: string;
  imageUrl: string;
  revealImageUrl?: string;
  gameCategory?: string;
  category?: string;
  status?: string;
  createdAt: Date;
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  userType?: string;
  kycRequest?: string;
  isBanned?: string;
  profilePicture?: string;
  company?: string;
  phone?: string;
  status?: string;
  createdAt: Date;
}

export interface NotificationSettings {
  newUserRegistration: boolean;
  raffleUpdate: boolean;
  maintenanceUpdates: boolean;
  user: boolean;
  raffle: boolean;
  inventory: boolean;
  remindersDoNotNotify: boolean;
  remindersImportantOnly: boolean;
  remindersAll: boolean;
  reminders2DoNotNotify: boolean;
  reminders2ImportantOnly: boolean;
  reminders2All: boolean;
  activityDoNotNotify: boolean;
  activityAll: boolean;
  notificationMethod: "email" | "inApp" | "both";
}

// ═══════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val.toDate) return val.toDate();
  return new Date(val);
}

function computeRaffleStatus(createdAt: Date, expiryDate: Date, rawStatus?: string): string {
  const now = new Date();
  const s = (rawStatus || "").toLowerCase();
  if (["refunded", "end early", "inactive"].includes(s)) return "ended";
  if (expiryDate <= now) return "ended";
  if (createdAt > now) return "pending";
  if (createdAt <= now && expiryDate > now) return "live";
  return "pending";
}

function mapPrizeDoc(d: DocumentData, id: string): Prize {
  const images = d.images || [];
  return {
    id,
    ...d,
    prizeName: d.prizeName || d.name || d.title || "",
    keyDetails: [d.keywords?.[0], d.keywords?.[1], d.keywords?.[2]].filter(Boolean).join(" | ") || d.keyDetails || "",
    prizeValue: parseFloat(d.retailValueUSD) || d.prizeValue || 0,
    stockLevel: parseInt(d.quantityAvailable) || d.stockLevel || 0,
    thumbnail: d.thumbnail || images[0] || d.imageUrl || "",
    images: images,
    status: d.status || "Active",
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  } as Prize;
}

function mapRaffleDoc(d: DocumentData, id: string): Raffle {
  const createdAt = toDate(d.createdAt);
  const expiryDate = toDate(d.expiryDate || d.endAt);
  return {
    id,
    ...d,
    title: d.title || "Untitled",
    description: d.description || d.prizeName || "",
    prizeName: d.prizeName || d.description || d.title || "",
    picture: d.picture || d.editedGamePicture || d.thumbnail || d.imageUrl || "",
    prizeImage: d.prizeImage || d.picture || "",
    prizeId: d.prizeId || "",
    ticketSold: d.ticketSold || d.ticketsSold || 0,
    ticketPrice: d.ticketPrice || 0,
    createdAt,
    expiryDate,
    status: d.status || "pending",
    computedStatus: computeRaffleStatus(createdAt, expiryDate, d.status),
    updatedAt: toDate(d.updatedAt),
  } as Raffle;
}

function mapSponsorDoc(d: DocumentData, id: string): Sponsor {
  return {
    id,
    ...d,
    name: d.sponsorName || d.name || "",
    sponsorName: d.sponsorName || d.name || "",
    logo: d.logo || [],
    logoUrl: d.logo?.[0] || d.logoUrl || "",
    gamesCreation: d.gamesCreation || [],
    prizesCreation: d.prizesCreation || [],
    status: d.status || "Active",
    createdAt: toDate(d.createdAt),
  } as Sponsor;
}

// ═══════════════════════════════════════
//  PRIZES  (prize_database)
// ═══════════════════════════════════════

export async function getPrizes(): Promise<Prize[]> {
  const q = query(collection(db, "prize_database"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapPrizeDoc(d.data(), d.id));
}

export function onPrizesChange(cb: (prizes: Prize[]) => void): Unsubscribe {
  const q = query(collection(db, "prize_database"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapPrizeDoc(d.data(), d.id)));
  });
}

export async function createPrize(data: Record<string, any>) {
  return addDoc(collection(db, "prize_database"), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function updatePrize(id: string, data: Record<string, any>) {
  const { id: _, createdAt, ...rest } = data;
  return updateDoc(doc(db, "prize_database", id), {
    ...rest,
    updatedAt: Timestamp.now(),
  });
}

export async function deletePrize(id: string) {
  // Clean up sponsor references
  const sponsorSnap = await getDocs(collection(db, "sponsors"));
  await Promise.all(
    sponsorSnap.docs.map(async (s) => {
      if (s.data().prizesCreation?.includes(id)) {
        await updateDoc(doc(db, "sponsors", s.id), { prizesCreation: arrayRemove(id) });
      }
    })
  );
  return deleteDoc(doc(db, "prize_database", id));
}

// ═══════════════════════════════════════
//  RAFFLES / GAMES
// ═══════════════════════════════════════

export async function getRaffles(): Promise<Raffle[]> {
  const q = query(collection(db, "raffles"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapRaffleDoc(d.data(), d.id));
}

export function onRafflesChange(cb: (raffles: Raffle[]) => void): Unsubscribe {
  const q = query(collection(db, "raffles"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => mapRaffleDoc(d.data(), d.id)));
  });
}

export async function createRaffle(data: Record<string, any>) {
  const docRef = await addDoc(collection(db, "raffles"), {
    ...data,
    createdAt: data.createdAt || Timestamp.now(),
    expiryDate: data.expiryDate || Timestamp.now(),
    updatedAt: Timestamp.now(),
    ticketSold: 0,
    ticketsSold: 0,
  });
  // Link to sponsor
  if (data.sponsorId) {
    try {
      await updateDoc(doc(db, "sponsors", data.sponsorId), {
        gamesCreation: arrayUnion(docRef.id),
      });
    } catch (e) { console.warn("Could not update sponsor gamesCreation:", e); }
  }
  return docRef;
}

export async function updateRaffle(id: string, data: Record<string, any>) {
  const { id: _, ...rest } = data;
  return updateDoc(doc(db, "raffles", id), { ...rest, updatedAt: Timestamp.now() });
}

export async function deleteRaffle(id: string) {
  return deleteDoc(doc(db, "raffles", id));
}

export async function getLiveRafflesCount(): Promise<number> {
  const snap = await getDocs(collection(db, "raffles"));
  const now = new Date();
  return snap.docs.filter((d) => {
    const data = d.data();
    const ca = toDate(data.createdAt);
    const ex = toDate(data.expiryDate || data.endAt);
    return ca <= now && ex > now;
  }).length;
}

export function onLiveRafflesCount(cb: (count: number) => void): Unsubscribe {
  return onSnapshot(collection(db, "raffles"), (snap) => {
    const now = new Date();
    const count = snap.docs.filter((d) => {
      const data = d.data();
      return toDate(data.createdAt) <= now && toDate(data.expiryDate || data.endAt) > now;
    }).length;
    cb(count);
  });
}

export async function getTotalTicketsSold(): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, "raffle_tickets"));
    return snap.data().count;
  } catch {
    const rSnap = await getDocs(collection(db, "raffles"));
    return rSnap.docs.reduce((s, d) => s + (d.data().ticketSold || d.data().ticketsSold || 0), 0);
  }
}

export function onTotalTicketsSold(cb: (count: number) => void): Unsubscribe {
  // Listen to raffle_tickets collection size changes
  return onSnapshot(collection(db, "raffle_tickets"), (snap) => {
    cb(snap.size);
  });
}

// ═══════════════════════════════════════
//  REVENUE  (from raffle_tickets)
// ═══════════════════════════════════════

export type RevenuePeriod = "Daily" | "Weekly" | "Monthly";

export async function getRevenueGrouped(
  type: RevenuePeriod
): Promise<{ labels: string[]; data: number[] }> {
  try {
    const snap = await getDocs(collection(db, "raffles"));
    return aggregateRevenueFromRaffles(snap, type);
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return { labels: [], data: [] };
  }
}
export function onRevenueChange(
  type: RevenuePeriod,
  cb: (result: { labels: string[]; data: number[] }) => void
): Unsubscribe {
  return onSnapshot(collection(db, "raffles"), (snap) => {
    cb(aggregateRevenueFromRaffles(snap, type));
  });
}
function aggregateRevenueFromRaffles(
  snap: QuerySnapshot<DocumentData>,
  type: RevenuePeriod
): { labels: string[]; data: number[] } {
  const map: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const ticketPrice = data.ticketPrice || 0;
    const ticketsSold = data.ticketSold || data.ticketsSold || 0;
    const revenue = ticketPrice * ticketsSold;
    if (revenue === 0) return;
    const ts = data.createdAt;
    if (!ts) return;
    const date = toDate(ts);
    let label = "";
    if (type === "Daily") {
      label = date.toLocaleDateString("en-US", { weekday: "short" });
    } else if (type === "Weekly") {
      const jan1 = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      label = `Week ${week}`;
    } else {
      label = date.toLocaleDateString("en-US", { month: "short" });
    }
    if (label) map[label] = (map[label] || 0) + revenue;
  });
  const labels = Object.keys(map).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return { labels, data: labels.map((l) => map[l]) };
}
// ═══════════════════════════════════════

export async function getSponsors(): Promise<Sponsor[]> {
  const snap = await getDocs(collection(db, "sponsors"));
  return snap.docs
    .map((d) => mapSponsorDoc(d.data(), d.id))
    .filter((s) => (s.status || "").toLowerCase() === "active");
}

export function onSponsorsChange(cb: (sponsors: Sponsor[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "sponsors"), (snap) => {
    cb(
      snap.docs
        .map((d) => mapSponsorDoc(d.data(), d.id))
        .filter((s) => (s.status || "").toLowerCase() === "active")
    );
  });
}

export async function createSponsor(data: Record<string, any>) {
  return addDoc(collection(db, "sponsors"), {
    ...data,
    gamesCreation: [],
    prizesCreation: [],
    status: "Active",
    createdAt: Timestamp.now(),
  });
}

export async function updateSponsor(id: string, data: Record<string, any>) {
  return updateDoc(doc(db, "sponsors", id), data);
}

export async function deleteSponsor(id: string) {
  // Soft delete — set status to Inactive
  return updateDoc(doc(db, "sponsors", id), { status: "Inactive" });
}

// ═══════════════════════════════════════
//  USERS / GAMERS
// ═══════════════════════════════════════

export async function getUsers(): Promise<GamerUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    name: d.data().userName || d.data().name || "",
    email: d.data().email || "",
    registrationDate: toDate(d.data().registrationDate || d.data().createdAt),
    status: d.data().isBanned ? "Banned" : (d.data().status || "Active"),
  })) as GamerUser[];
}

export function onUsersChange(cb: (users: GamerUser[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "users"), (snap) => {
    cb(snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      name: d.data().userName || d.data().name || "",
      email: d.data().email || "",
      registrationDate: toDate(d.data().registrationDate || d.data().createdAt),
      status: d.data().isBanned ? "Banned" : (d.data().status || "Active"),
    })) as GamerUser[]);
  });
}

export async function getUsersCount(): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, "users"));
    return snap.data().count;
  } catch {
    return (await getDocs(collection(db, "users"))).size;
  }
}

export function onUsersCount(cb: (count: number) => void): Unsubscribe {
  return onSnapshot(collection(db, "users"), (snap) => cb(snap.size));
}

export async function blockUser(id: string) {
  return updateDoc(doc(db, "users", id), { isBanned: true, status: "Blocked" });
}

export async function unblockUser(id: string) {
  return updateDoc(doc(db, "users", id), { isBanned: false, status: "Active" });
}

export async function suspendUser(id: string) {
  return updateDoc(doc(db, "users", id), { status: "Suspended" });
}

// ═══════════════════════════════════════
//  ADMINS
// ═══════════════════════════════════════

export async function getAdmins(): Promise<Admin[]> {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    name: d.data().fullName || d.data().name || "",
    phone: d.data().phoneNumber || d.data().phone || "",
    createdAt: toDate(d.data().createdAt),
  })) as Admin[];
}

export function onAdminsChange(cb: (admins: Admin[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "admins"), (snap) => {
    cb(snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      name: d.data().fullName || d.data().name || "",
      phone: d.data().phoneNumber || d.data().phone || "",
      createdAt: toDate(d.data().createdAt),
    })) as Admin[]);
  });
}

export async function createAdmin(uid: string, data: Record<string, any>) {
  return setDoc(doc(db, "admins", uid), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateAdmin(id: string, data: Record<string, any>) {
  return updateDoc(doc(db, "admins", id), data);
}

export async function deleteAdmin(id: string) {
  return deleteDoc(doc(db, "admins", id));
}

export async function getAdminByUid(uid: string): Promise<Admin | null> {
  const snap = await getDoc(doc(db, "admins", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data(), name: snap.data().fullName || snap.data().name || "", createdAt: toDate(snap.data().createdAt) } as Admin;
}

// ═══════════════════════════════════════
//  GAME IMAGES  (image_library + game_images)
// ═══════════════════════════════════════

// Old repo uses "image_library", we support both
const IMAGE_COLLECTION = "image_library";

export async function getGameImages(): Promise<GameImage[]> {
  const snap = await getDocs(collection(db, IMAGE_COLLECTION));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    title: d.data().title || d.data().name || "",
    imageUrl: d.data().imageUrl || "",
    revealImageUrl: d.data().revealImageUrl || "",
    category: d.data().gameCategory || d.data().category || "",
    createdAt: toDate(d.data().createdAt),
  })) as GameImage[];
}

export function onGameImagesChange(cb: (images: GameImage[]) => void): Unsubscribe {
  return onSnapshot(collection(db, IMAGE_COLLECTION), (snap) => {
    cb(snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      title: d.data().title || d.data().name || "",
      imageUrl: d.data().imageUrl || "",
      revealImageUrl: d.data().revealImageUrl || "",
      category: d.data().gameCategory || d.data().category || "",
      createdAt: toDate(d.data().createdAt),
    })) as GameImage[]);
  });
}

export async function createGameImage(data: Record<string, any>) {
  return addDoc(collection(db, IMAGE_COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateGameImage(id: string, data: Record<string, any>) {
  return updateDoc(doc(db, IMAGE_COLLECTION, id), data);
}

export async function deleteGameImage(id: string) {
  return deleteDoc(doc(db, IMAGE_COLLECTION, id));
}

// ═══════════════════════════════════════
//  PARTNERS
// ═══════════════════════════════════════

export async function getPartners(): Promise<Partner[]> {
  const snap = await getDocs(collection(db, "partners"));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    name: d.data().name || "",
    email: d.data().email || "",
    createdAt: toDate(d.data().createdAt),
  })) as Partner[];
}

export function onPartnersChange(cb: (partners: Partner[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "partners"), (snap) => {
    cb(snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      name: d.data().name || "",
      email: d.data().email || "",
      createdAt: toDate(d.data().createdAt),
    })) as Partner[]);
  });
}

export async function createPartner(data: Record<string, any>) {
  return addDoc(collection(db, "partners"), { ...data, createdAt: Timestamp.now() });
}

export async function updatePartner(id: string, data: Record<string, any>) {
  return updateDoc(doc(db, "partners", id), data);
}

export async function deletePartner(id: string) {
  return deleteDoc(doc(db, "partners", id));
}

// ═══════════════════════════════════════
//  NOTIFICATION SETTINGS
// ═══════════════════════════════════════

export const defaultNotificationSettings: NotificationSettings = {
  newUserRegistration: false,
  raffleUpdate: false,
  maintenanceUpdates: false,
  user: false,
  raffle: false,
  inventory: false,
  remindersDoNotNotify: true,
  remindersImportantOnly: false,
  remindersAll: false,
  reminders2DoNotNotify: true,
  reminders2ImportantOnly: false,
  reminders2All: false,
  activityDoNotNotify: true,
  activityAll: false,
  notificationMethod: "both",
};

export async function getNotificationSettings(uid: string): Promise<NotificationSettings | null> {
  try {
    const snap = await getDoc(doc(db, "notification_settings", uid));
    return snap.exists() ? (snap.data() as NotificationSettings) : null;
  } catch { return null; }
}

export async function saveNotificationSettings(uid: string, settings: NotificationSettings) {
  return setDoc(doc(db, "notification_settings", uid), settings, { merge: true });
}

// ═══════════════════════════════════════
//  DASHBOARD KPIs (real-time)
// ═══════════════════════════════════════

export async function getLowStockCount(): Promise<number> {
  try {
    const q = query(collection(db, "prize_database"), where("stockLevel", "<=", 3));
    return (await getDocs(q)).size;
  } catch {
    // Fallback: use quantityAvailable field
    const snap = await getDocs(collection(db, "prize_database"));
    return snap.docs.filter((d) => {
      const qty = parseInt(d.data().quantityAvailable) || d.data().stockLevel || 999;
      return qty <= 3;
    }).length;
  }
}

export async function getLowStockPrizes(): Promise<Prize[]> {
  const snap = await getDocs(collection(db, "prize_database"));
  return snap.docs
    .map((d) => mapPrizeDoc(d.data(), d.id))
    .filter((p) => (p.stockLevel || 999) <= 5)
    .sort((a, b) => (a.stockLevel || 0) - (b.stockLevel || 0))
    .slice(0, 6);
}

export function onLowStockPrizes(cb: (prizes: Prize[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "prize_database"), (snap) => {
    const prizes = snap.docs
      .map((d) => mapPrizeDoc(d.data(), d.id))
      .filter((p) => (p.stockLevel || 999) <= 5)
      .sort((a, b) => (a.stockLevel || 0) - (b.stockLevel || 0))
      .slice(0, 6);
    cb(prizes);
  });
}
