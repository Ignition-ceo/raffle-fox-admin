import BulkSelectGameDatabase from '../components/BulkSelectGameDatabase';
import { useEffect, useState } from "react";
import { Plus, Eye, Trash2, Pencil, Clock, SlidersHorizontal, Upload } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  onRafflesChange, createRaffle, updateRaffle, deleteRaffle,
  getPrizes, getSponsors, getGameImages,
  type Raffle, type Prize, type Sponsor, type GameImage,
} from "@/lib/firestore";
import { uploadGameImage } from "@/lib/gameImageUpload";

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function fmtRemaining(end: Date): string {
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

interface GameForm {
  title: string;
  description: string;
  ticketPrice: string;
  category: string;
  gameCategory: string;
  gameDescription: string;
  createdAt: string;
  expiryDate: string;
  startTime: string;
  endTime: string;
  prizeId: string;
  sponsorId: string;
  picture: string;
  status: string;
  // File uploads (not persisted — used for upload flow)
  _gameImageFile?: File;
  _revealImageFile?: File;
}

const defaultForm: GameForm = {
  title: "", description: "", ticketPrice: "1", category: "Gaming",
  gameCategory: "", gameDescription: "Find the ball",
  createdAt: new Date().toISOString().split("T")[0],
  expiryDate: "",
  startTime: "09:00", endTime: "17:00",
  prizeId: "", sponsorId: "", picture: "", status: "Active",
  _gameImageFile: undefined, _revealImageFile: undefined,
};

export default function Games() {
  const [loading, setLoading] = useState(true);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [gameImages, setGameImages] = useState<GameImage[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Raffle | null>(null);
  const [editItem, setEditItem] = useState<Raffle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<GameForm>({ ...defaultForm });
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onRafflesChange((data) => { setRaffles(data); setLoading(false); });
    getPrizes().then(setPrizes).catch(() => {});
    getSponsors().then(setSponsors).catch(() => {});
    getGameImages().then(setGameImages).catch(() => {});
    return unsub;
  }, []);

  const openCreate = () => {
    setForm({ ...defaultForm });
    setCreateOpen(true);
  };

  // ── CREATE with dual image upload ──
  const handleCreate = async () => {
    if (!form.title || !form.expiryDate) {
      toast({ variant: "destructive", title: "Title and end date are required" }); return;
    }

    setSaving(true);
    try {
      const prize = prizes.find((p) => p.id === form.prizeId);

      // 1. Create raffle doc (no images yet)
      const docRef = await createRaffle({
        title: form.title,
        description: prize?.prizeName || form.description,
        picture: form.picture, // fallback if no file uploaded
        revealImage: "",
        prizeId: form.prizeId,
        sponsorId: form.sponsorId || prize?.sponsorId || "",
        ticketPrice: parseInt(form.ticketPrice) || 1,
        category: form.category,
        gameCategory: form.gameCategory,
        gameDescription: form.gameDescription,
        startTime: form.startTime,
        endTime: form.endTime,
        status: form.status,
        createdAt: Timestamp.fromDate(new Date(form.createdAt)),
        expiryDate: Timestamp.fromDate(new Date(form.expiryDate)),
      });

      const raffleId = docRef.id;
      const updates: Record<string, string> = {};

      // 2. Upload game image if file selected
      if (form._gameImageFile) {
        const gameImageUrl = await uploadGameImage(raffleId, form._gameImageFile, "game");
        updates.picture = gameImageUrl;
      }

      // 3. Upload reveal image if file selected
      if (form._revealImageFile) {
        const revealImageUrl = await uploadGameImage(raffleId, form._revealImageFile, "reveal");
        updates.revealImage = revealImageUrl;
      }

      // 4. Update raffle with image URLs
      if (Object.keys(updates).length > 0) {
        await updateRaffle(raffleId, updates);
      }

      toast({ title: "Game created!" });
      setCreateOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message || "Failed to create game" });
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: "extend" | "refund" | "endEarly", newDate?: string) => {
    try {
      if (action === "extend" && newDate) {
        await updateRaffle(id, { expiryDate: Timestamp.fromDate(new Date(newDate)) });
        toast({ title: "Game extended!" });
      } else if (action === "refund") {
        await updateRaffle(id, { status: "refunded" });
        toast({ title: "Refund processed" });
      } else if (action === "endEarly") {
        await updateRaffle(id, { status: "end early" });
        toast({ title: "Game ended early" });
      }
      setEditItem(null);
    } catch { toast({ variant: "destructive", title: "Action failed" }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteRaffle(deleteId); toast({ title: "Game deleted" }); setDeleteId(null); }
    catch { toast({ variant: "destructive", title: "Delete failed" }); }
  };

  const columns = [
    { key: "title", header: "Game Name" },
    {
      key: "description", header: "Prize",
      render: (v: string, row: Raffle) => (
        <div className="flex items-center gap-2">
          {row.picture && <img src={row.picture} className="h-8 w-8 rounded object-cover" alt="" />}
          <span className="truncate max-w-[150px]">{v || "—"}</span>
        </div>
      ),
    },
    { key: "ticketPrice", header: "Ticket Price", render: (v: number) => `${v} Gold Coin${v !== 1 ? "s" : ""}` },
    { key: "startDate", header: "Start", render: (_: any, r: Raffle) => fmtDate(r.createdAt) },
    { key: "endDate", header: "End", render: (_: any, r: Raffle) => fmtDate(r.expiryDate) },
    {
      key: "timeRemaining", header: "Time Left",
      render: (_: any, r: Raffle) => (
        <div className="flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          <span>{fmtRemaining(r.expiryDate)}</span>
        </div>
      ),
    },
    { key: "computedStatus", header: "Status", render: (v: string) => <StatusPill status={v} /> },
    {
      key: "actions", header: "",
      render: (_: any, row: Raffle) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Game Database" subtitle="Manage raffles, games and competitions"
        actions={
          <>
            <Button variant="outline"><SlidersHorizontal className="h-4 w-4 mr-2" />Filter</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Game</Button>
          </>
        } />
      <Card className="p-5 shadow-sm">
        {loading ? <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          : <DataTable columns={columns} data={raffles} />}
      </Card>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Game</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter game title" /></div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Select Prize *</Label>
                <Select value={form.prizeId} onValueChange={(v) => {
                  const p = prizes.find((x) => x.id === v);
                  setForm({ ...form, prizeId: v, description: p?.prizeName || "", sponsorId: p?.sponsorId || form.sponsorId, picture: p?.thumbnail || form.picture });
                }}>
                  <SelectTrigger><SelectValue placeholder="Pick a prize" /></SelectTrigger>
                  <SelectContent>{prizes.map((p) => <SelectItem key={p.id} value={p.id}>{p.prizeName} (${p.prizeValue})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Ticket Price (Gold Coins) *</Label>
                <Select value={form.ticketPrice} onValueChange={(v) => setForm({ ...form, ticketPrice: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 50 }, (_, i) => i + 1).map((n) => <SelectItem key={n} value={String(n)}>{n} Gold Coin{n > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prize Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Gaming", "Lifestyle", "Entertainment", "Vehicle", "Devices", "Electronics", "Style", "Beauty & Grooming"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Game Category</Label><Input value={form.gameCategory} onChange={(e) => setForm({ ...form, gameCategory: e.target.value })} placeholder="Puzzle, Action, Strategy..." /></div>
            </div>

            <div><Label>Game Description</Label><Input value={form.gameDescription} onChange={(e) => setForm({ ...form, gameDescription: e.target.value })} /></div>

            {/* ── Game Images (Dual Upload) ── */}
            <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
              <div>
                <Label className="text-base font-semibold">Game Images</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload the main game image and the reveal image shown after the raffle ends.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Primary Game Image */}
                <div className="space-y-2">
                  <Label className="text-sm">Game Image (Primary) *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 transition-colors">
                    {form._gameImageFile ? (
                      <div className="space-y-2">
                        <img
                          src={URL.createObjectURL(form._gameImageFile)}
                          alt="Game preview"
                          className="h-24 w-full object-cover rounded"
                        />
                        <p className="text-xs text-muted-foreground truncate">{form._gameImageFile.name}</p>
                        <Button variant="outline" size="sm" onClick={() => setForm({ ...form, _gameImageFile: undefined })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-4">
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) setForm({ ...form, _gameImageFile: e.target.files[0] });
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Displayed before and during the raffle.</p>
                </div>

                {/* Reveal Image */}
                <div className="space-y-2">
                  <Label className="text-sm">Reveal Image (Post-Raffle)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 transition-colors">
                    {form._revealImageFile ? (
                      <div className="space-y-2">
                        <img
                          src={URL.createObjectURL(form._revealImageFile)}
                          alt="Reveal preview"
                          className="h-24 w-full object-cover rounded"
                        />
                        <p className="text-xs text-muted-foreground truncate">{form._revealImageFile.name}</p>
                        <Button variant="outline" size="sm" onClick={() => setForm({ ...form, _revealImageFile: undefined })}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-4">
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) setForm({ ...form, _revealImageFile: e.target.files[0] });
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Displayed only after the raffle ends.</p>
                </div>
              </div>

              {/* Fallback: select from library */}
              {!form._gameImageFile && gameImages.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Or select from library:</Label>
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    {gameImages.slice(0, 10).map((img) => (
                      <div key={img.id} onClick={() => setForm({ ...form, picture: img.imageUrl, gameCategory: img.category || form.gameCategory })}
                        className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${form.picture === img.imageUrl ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}>
                        <img src={img.imageUrl} alt={img.title} className="h-12 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date *</Label><Input type="date" value={form.createdAt} onChange={(e) => setForm({ ...form, createdAt: e.target.value })} /></div>
              <div><Label>End Date *</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} min={form.createdAt} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Uploading & Creating..." : "Create Game"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog (shows reveal image for ended games) ── */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              {/* Show game image or reveal image based on status */}
              {viewItem.computedStatus === "ended" && (viewItem as any).revealImage ? (
                <div className="space-y-1">
                  <img src={(viewItem as any).revealImage} className="w-full h-40 object-cover rounded-lg" alt="Reveal" />
                  <p className="text-xs text-center text-muted-foreground">Reveal Image (Post-Raffle)</p>
                </div>
              ) : viewItem.picture ? (
                <img src={viewItem.picture} className="w-full h-40 object-cover rounded-lg" alt="" />
              ) : null}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Prize:</span> {viewItem.description}</div>
                <div><span className="text-muted-foreground">Ticket Price:</span> {viewItem.ticketPrice} GC</div>
                <div><span className="text-muted-foreground">Tickets Sold:</span> {viewItem.ticketSold}</div>
                <div><span className="text-muted-foreground">Category:</span> {viewItem.category}</div>
                <div><span className="text-muted-foreground">Start:</span> {fmtDate(viewItem.createdAt)}</div>
                <div><span className="text-muted-foreground">End:</span> {fmtDate(viewItem.expiryDate)}</div>
                <div><span className="text-muted-foreground">Time Left:</span> {fmtRemaining(viewItem.expiryDate)}</div>
                <div><span className="text-muted-foreground">Status:</span> <StatusPill status={viewItem.computedStatus} /></div>
              </div>

              {/* Show both images if both exist */}
              {viewItem.picture && (viewItem as any).revealImage && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">All Images</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <img src={viewItem.picture} className="w-full h-24 object-cover rounded" alt="Game" />
                      <p className="text-[10px] text-center text-muted-foreground mt-1">Game Image</p>
                    </div>
                    <div>
                      <img src={(viewItem as any).revealImage} className="w-full h-24 object-cover rounded" alt="Reveal" />
                      <p className="text-[10px] text-center text-muted-foreground mt-1">Reveal Image</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit / Actions Dialog ── */}
      <EditActionsDialog item={editItem} onClose={() => setEditItem(null)} onAction={handleAction} />

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Game</AlertDialogTitle><AlertDialogDescription>This will permanently delete this raffle game.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

// ── Edit Actions Sub-Dialog (Extend / Refund / End Early) ──
function EditActionsDialog({ item, onClose, onAction }: {
  item: Raffle | null; onClose: () => void;
  onAction: (id: string, action: "extend" | "refund" | "endEarly", date?: string) => void;
}) {
  const [extendDate, setExtendDate] = useState("");
  const [confirmAction, setConfirmAction] = useState<"refund" | "endEarly" | null>(null);

  if (!item) return null;

  return (
    <>
      <Dialog open={!!item && !confirmAction} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Manage: {item.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Status:</span> <StatusPill status={item.computedStatus} /></div>
              <div><span className="text-muted-foreground">Ends:</span> {fmtDate(item.expiryDate)}</div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <div>
                <Label>Extend End Date</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} min={item.expiryDate.toISOString().split("T")[0]} className="flex-1" />
                  <Button onClick={() => { if (extendDate) onAction(item.id, "extend", extendDate); }} disabled={!extendDate} className="bg-emerald-600 hover:bg-emerald-700">Extend</Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50" onClick={() => setConfirmAction("refund")}>Refund All</Button>
                <Button variant="outline" className="flex-1 border-red-500 text-red-600 hover:bg-red-50" onClick={() => setConfirmAction("endEarly")}>End Early</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction === "refund" ? "Refund All Participants" : "End Game Early"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "refund" ? "All participants will be refunded. This cannot be undone." : "This game will be ended immediately. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmAction) onAction(item.id, confirmAction); setConfirmAction(null); }}
              className="bg-destructive text-destructive-foreground">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
