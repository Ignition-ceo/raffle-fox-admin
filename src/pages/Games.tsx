import { useEffect, useState } from "react";
import { Plus, Eye, Trash2, Pencil, Clock, SlidersHorizontal, Square, Play } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, type BulkAction } from "@/components/dashboard/DataTable";
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

function isGameLive(row: Raffle): boolean {
  const s = (row.computedStatus || row.status || "").toLowerCase();
  return s === "live" || s === "active";
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
  revealImage: string;
  status: string;
  selectedGameImageId: string;
}

const defaultForm: GameForm = {
  title: "", description: "", ticketPrice: "1", category: "Gaming",
  gameCategory: "", gameDescription: "Find the ball",
  createdAt: new Date().toISOString().split("T")[0],
  expiryDate: "",
  startTime: "09:00", endTime: "17:00",
  prizeId: "", sponsorId: "", picture: "", revealImage: "", status: "Active",
  selectedGameImageId: "",
};

const gameBulkActions: BulkAction[] = [
  { key: "end", label: "End Games", icon: <Square className="h-3.5 w-3.5" />, variant: "default" },
  { key: "reactivate", label: "Reactivate", icon: <Play className="h-3.5 w-3.5" />, variant: "default" },
  { key: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive" },
];

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

  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [bulkEndIds, setBulkEndIds] = useState<string[]>([]);
  const [bulkReactivateIds, setBulkReactivateIds] = useState<string[]>([]);

  // Game image selection UI state
  const [previewImage, setPreviewImage] = useState<GameImage | null>(null);
  const [browseAllOpen, setBrowseAllOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const unsub = onRafflesChange((data) => { setRaffles(data); setLoading(false); });
    getPrizes().then(setPrizes).catch(() => {});
    getSponsors().then(setSponsors).catch(() => {});
    getGameImages().then(setGameImages).catch(() => {});
    return unsub;
  }, []);

  const openCreate = () => { setForm({ ...defaultForm }); setCreateOpen(true); };

  const handleCreate = async () => {
    if (!form.title || !form.expiryDate) {
      toast({ variant: "destructive", title: "Title and end date are required" }); return;
    }
    if (!form.picture) {
      toast({ variant: "destructive", title: "Please select a game image" }); return;
    }
    setSaving(true);
    try {
      const prize = prizes.find((p) => p.id === form.prizeId);
      await createRaffle({
        title: form.title,
        description: prize?.prizeName || form.description,
        picture: form.picture,
        revealImage: form.revealImage, // silently attached from game image pair
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
      toast({ title: "Game created!" });
      setCreateOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message || "Failed to create game" });
    } finally { setSaving(false); }
  };

  const handleAction = async (id: string, action: "extend" | "refund" | "endEarly", newDate?: string) => {
    try {
      if (action === "extend" && newDate) { await updateRaffle(id, { expiryDate: Timestamp.fromDate(new Date(newDate)) }); toast({ title: "Game extended!" }); }
      else if (action === "refund") { await updateRaffle(id, { status: "refunded" }); toast({ title: "Refund processed" }); }
      else if (action === "endEarly") { await updateRaffle(id, { status: "end early" }); toast({ title: "Game ended early" }); }
      setEditItem(null);
    } catch { toast({ variant: "destructive", title: "Action failed" }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteRaffle(deleteId); toast({ title: "Game deleted" }); setDeleteId(null); }
    catch { toast({ variant: "destructive", title: "Delete failed" }); }
  };

  const handleBulkAction = (actionKey: string, selectedIds: string[]) => {
    switch (actionKey) {
      case "delete": {
        const deletable = selectedIds.filter((id) => {
          const game = raffles.find((r) => r.id === id);
          return game && !isGameLive(game);
        });
        const skipped = selectedIds.length - deletable.length;
        if (deletable.length === 0) {
          toast({ variant: "destructive", title: "Cannot delete active games", description: `All ${selectedIds.length} selected game${selectedIds.length > 1 ? "s are" : " is"} currently live and cannot be deleted.` });
          return;
        }
        if (skipped > 0) {
          toast({ title: `${skipped} active game${skipped > 1 ? "s" : ""} skipped`, description: "Active games cannot be deleted." });
        }
        setBulkDeleteIds(deletable);
        break;
      }
      case "end": setBulkEndIds(selectedIds); break;
      case "reactivate": setBulkReactivateIds(selectedIds); break;
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(bulkDeleteIds.map((id) => deleteRaffle(id)));
      toast({ title: `${bulkDeleteIds.length} game${bulkDeleteIds.length > 1 ? "s" : ""} deleted` });
      setBulkDeleteIds([]);
    } catch { toast({ variant: "destructive", title: "Some deletes failed" }); }
  };

  const handleBulkEnd = async () => {
    try {
      await Promise.all(bulkEndIds.map((id) => updateRaffle(id, { status: "end early" })));
      toast({ title: `${bulkEndIds.length} game${bulkEndIds.length > 1 ? "s" : ""} ended` });
      setBulkEndIds([]);
    } catch { toast({ variant: "destructive", title: "Some updates failed" }); }
  };

  const handleBulkReactivate = async () => {
    try {
      await Promise.all(bulkReactivateIds.map((id) => updateRaffle(id, { status: "Active" })));
      toast({ title: `${bulkReactivateIds.length} game${bulkReactivateIds.length > 1 ? "s" : ""} reactivated` });
      setBulkReactivateIds([]);
    } catch { toast({ variant: "destructive", title: "Some updates failed" }); }
  };

  /** When admin selects a game image from library, auto-attach reveal silently */
  const selectGameImage = (img: GameImage) => {
    setForm({
      ...form,
      picture: img.imageUrl,
      revealImage: (img as any).revealImageUrl || "",
      gameCategory: img.category || form.gameCategory,
      selectedGameImageId: img.id,
    });
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
        <div className="flex items-center gap-1 text-xs"><Clock className="h-3 w-3" /><span>{fmtRemaining(r.expiryDate)}</span></div>
      ),
    },
    { key: "computedStatus", header: "Status", render: (v: string) => <StatusPill status={v} /> },
    {
      key: "actions", header: "",
      render: (_: any, row: Raffle) => {
        const live = isGameLive(row);
        return (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 text-destructive"
              disabled={live}
              onClick={() => { if (!live) setDeleteId(row.id); }}
            >
              <Trash2 className={`h-4 w-4 ${live ? "opacity-30" : ""}`} />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Game Database" subtitle="Manage raffles, games and competitions"
        actions={<>
          <Button variant="outline"><SlidersHorizontal className="h-4 w-4 mr-2" />Filter</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Game</Button>
        </>} />
      <Card className="p-5 shadow-sm">
        {loading ? <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          : <DataTable columns={columns} data={raffles} bulkActions={gameBulkActions} onBulkAction={handleBulkAction} />}
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
                  setForm({ ...form, prizeId: v, description: p?.prizeName || "", sponsorId: p?.sponsorId || form.sponsorId });
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

            {/* ── Game Image Selection (library only, no upload) ── */}
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Select Game Image *</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Click an image to preview, then confirm your selection.</p>
                </div>
                {form.selectedGameImageId && (
                  <Button variant="outline" size="sm" onClick={() => setForm({ ...form, picture: "", revealImage: "", selectedGameImageId: "", gameCategory: form.gameCategory })}>
                    Change Selection
                  </Button>
                )}
              </div>

              {gameImages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No game images available. Contact a super admin to add images.</p>
              ) : (
                <>
                  {/* Selected image highlight */}
                  {form.selectedGameImageId && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <img src={form.picture} alt="Selected" className="h-14 w-20 object-cover rounded" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">
                          {gameImages.find((g) => g.id === form.selectedGameImageId)?.title || "Selected"}
                        </p>
                        <p className="text-xs text-emerald-600">✓ Image selected — reveal image auto-attached</p>
                      </div>
                    </div>
                  )}

                  {/* Thumbnail grid — show first 5, dim others when one is selected */}
                  <div className="grid grid-cols-5 gap-2">
                    {gameImages.slice(0, 5).map((img) => {
                      const isSelected = form.selectedGameImageId === img.id;
                      const hasSelection = !!form.selectedGameImageId;
                      return (
                        <div
                          key={img.id}
                          onClick={() => setPreviewImage(img)}
                          className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30"
                              : hasSelection
                                ? "border-border opacity-40 hover:opacity-70"
                                : "border-border hover:border-primary/50"
                          }`}
                        >
                          <img src={img.imageUrl} alt={img.title} className="h-16 w-full object-cover" />
                          <p className="text-[10px] text-center text-muted-foreground truncate px-1 py-0.5">{img.title}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Browse All button if more than 5 images */}
                  {gameImages.length > 5 && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setBrowseAllOpen(true)}>
                      Browse All Images ({gameImages.length} available)
                    </Button>
                  )}
                </>
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
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Game"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog — NEVER shows reveal image ── */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              {viewItem.picture && (
                <img src={viewItem.picture} className="w-full h-40 object-cover rounded-lg" alt="" />
              )}
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditActionsDialog item={editItem} isLive={editItem ? isGameLive(editItem) : false} onClose={() => setEditItem(null)} onAction={handleAction} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Game</AlertDialogTitle><AlertDialogDescription>This will permanently delete this raffle game. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteIds.length > 0} onOpenChange={() => setBulkDeleteIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {bulkDeleteIds.length} Game{bulkDeleteIds.length > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the selected games. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkEndIds.length > 0} onOpenChange={() => setBulkEndIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {bulkEndIds.length} Game{bulkEndIds.length > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>These games will be ended immediately. Players will no longer be able to purchase tickets.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkEnd}>End Games</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkReactivateIds.length > 0} onOpenChange={() => setBulkReactivateIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate {bulkReactivateIds.length} Game{bulkReactivateIds.length > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>These games will be set back to active. Players will be able to purchase tickets again.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkReactivate}>Reactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── Image Preview Modal (click to see full size, confirm to select) ── */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{previewImage?.title}</DialogTitle></DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              <img src={previewImage.imageUrl} alt={previewImage.title} className="w-full rounded-lg" />
              <p className="text-sm text-muted-foreground">Category: {previewImage.category || "Uncategorized"}</p>
              {form.selectedGameImageId === previewImage.id ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  <span>✓</span> This image is currently selected
                </div>
              ) : (
                <Button className="w-full" onClick={() => { selectGameImage(previewImage); setPreviewImage(null); }}>
                  Select This Image
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Browse All Game Images Modal ── */}
      <Dialog open={browseAllOpen} onOpenChange={setBrowseAllOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Game Images ({gameImages.length})</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {gameImages.map((img) => {
              const isSelected = form.selectedGameImageId === img.id;
              const hasSelection = !!form.selectedGameImageId;
              return (
                <div
                  key={img.id}
                  onClick={() => { setPreviewImage(img); setBrowseAllOpen(false); }}
                  className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : hasSelection
                        ? "border-border opacity-40 hover:opacity-70"
                        : "border-border hover:border-primary/50"
                  }`}
                >
                  <img src={img.imageUrl} alt={img.title} className="h-28 w-full object-cover" />
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{img.title}</p>
                    <p className="text-[10px] text-muted-foreground">{img.category || "Uncategorized"}</p>
                    {isSelected && <p className="text-[10px] text-emerald-600 font-medium mt-0.5">✓ Selected</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function EditActionsDialog({ item, isLive, onClose, onAction }: {
  item: Raffle | null; isLive: boolean; onClose: () => void;
  onAction: (id: string, action: "extend" | "refund" | "endEarly", date?: string) => void;
}) {
  const [extendDate, setExtendDate] = useState("");
  const [extendTime, setExtendTime] = useState("");
  const [confirmAction, setConfirmAction] = useState<"refund" | "endEarly" | null>(null);
  if (!item) return null;
  return (
    <>
      <Dialog open={!!item && !confirmAction} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isLive ? "Extend: " : "Manage: "}{item.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Status:</span> <StatusPill status={item.computedStatus} /></div>
              <div><span className="text-muted-foreground">Ends:</span> {fmtDate(item.expiryDate)}</div>
            </div>
            {isLive && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-xs text-amber-700">This game is currently live. Only extending the end date/time is allowed.</p>
              </div>
            )}
            <div className="border-t pt-4 space-y-3">
              <div>
                <Label>Extend End Date</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} min={item.expiryDate.toISOString().split("T")[0]} className="flex-1" />
                </div>
              </div>
              <div>
                <Label>Extend End Time</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="time" value={extendTime} onChange={(e) => setExtendTime(e.target.value)} className="flex-1" />
                </div>
              </div>
              <Button
                onClick={() => {
                  if (extendDate) {
                    const dateStr = extendTime ? `${extendDate}T${extendTime}` : extendDate;
                    onAction(item.id, "extend", dateStr);
                  }
                }}
                disabled={!extendDate}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Extend Game
              </Button>
              {!isLive && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" className="flex-1 border-amber-500 text-amber-600 hover:bg-amber-50" onClick={() => setConfirmAction("refund")}>Refund Game</Button>
                  <Button variant="outline" className="flex-1 border-red-500 text-red-600 hover:bg-red-50" onClick={() => setConfirmAction("endEarly")}>End Early</Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction === "refund" ? "Refund Game" : "End Game Early"}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction === "refund" ? "All participants will be refunded. This cannot be undone." : "This game will be ended immediately. This cannot be undone."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmAction) onAction(item.id, confirmAction); setConfirmAction(null); }} className="bg-destructive text-destructive-foreground">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
