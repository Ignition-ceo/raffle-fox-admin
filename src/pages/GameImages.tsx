import { useEffect, useState } from "react";
import { Plus, Eye, Trash2, Pencil, ImageIcon, ShieldAlert, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
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
import { useAuth } from "@/contexts/AuthContext";
import { onGameImagesChange, createGameImage, updateGameImage, deleteGameImage, type GameImage } from "@/lib/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function GameImages() {
  const { adminProfile } = useAuth();
  const isSuperAdmin = adminProfile?.role === "super_admin";

  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<GameImage[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<GameImage | null>(null);
  const [editItem, setEditItem] = useState<GameImage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ title: "", gameCategory: "" });
  const [gameFile, setGameFile] = useState<File | null>(null);
  const [revealFile, setRevealFile] = useState<File | null>(null);

  useEffect(() => {
    const unsub = onGameImagesChange((data) => { setImages(data); setLoading(false); });
    return unsub;
  }, []);

  // Block non-super-admins
  if (!isSuperAdmin) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground max-w-md">
            Game Images management is restricted to super administrators only.
            Contact your super admin if you need changes to the game image library.
          </p>
        </div>
      </AppShell>
    );
  }

  const resetForm = () => { setForm({ title: "", gameCategory: "" }); setGameFile(null); setRevealFile(null); };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleCreate = async () => {
    if (!form.title) { toast({ variant: "destructive", title: "Title is required" }); return; }
    if (!gameFile) { toast({ variant: "destructive", title: "Game image (no ball) is required" }); return; }
    if (!revealFile) { toast({ variant: "destructive", title: "Reveal image (with ball) is required" }); return; }

    setSaving(true);
    try {
      const imageUrl = await uploadFile(gameFile, "game_images");
      const revealImageUrl = await uploadFile(revealFile, "game_images/reveals");

      await createGameImage({
        title: form.title,
        gameCategory: form.gameCategory,
        imageUrl,
        revealImageUrl,
      });
      toast({ title: "Image pair added!" });
      setCreateOpen(false); resetForm();
    } catch { toast({ variant: "destructive", title: "Failed to add image" }); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        title: form.title,
        gameCategory: form.gameCategory,
      };

      if (gameFile) {
        updates.imageUrl = await uploadFile(gameFile, "game_images");
      }
      if (revealFile) {
        updates.revealImageUrl = await uploadFile(revealFile, "game_images/reveals");
      }

      await updateGameImage(editItem.id, updates);
      toast({ title: "Image updated!" });
      setEditItem(null); resetForm();
    } catch { toast({ variant: "destructive", title: "Failed to update" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteGameImage(deleteId); toast({ title: "Image pair deleted" }); setDeleteId(null); }
    catch { toast({ variant: "destructive", title: "Delete failed" }); }
  };

  const openEdit = (img: GameImage) => {
    setForm({ title: img.title, gameCategory: img.category || "" });
    setGameFile(null);
    setRevealFile(null);
    setEditItem(img);
  };

  const categories = ["Puzzle", "Action", "Strategy", "Racing", "Sports", "Card Game", "Other"];

  return (
    <AppShell>
      <PageHeader title="Game Images" subtitle="Manage game image pairs (super admin only)"
        actions={<Button onClick={() => { resetForm(); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Image Pair</Button>} />

      <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
        <p className="text-sm text-amber-800 font-medium">🔒 Super Admin Only</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Each entry requires two images: the game image (ball hidden) shown to players, and the reveal image (ball visible) shown only after the game ends. The reveal image is never visible in the regular admin panel.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : images.length === 0 ? (
        <Card className="p-12 text-center"><ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No game images yet.</p></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden group relative">
              <div className="h-36 bg-muted">
                {img.imageUrl ? <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" />
                  : <div className="flex items-center justify-center h-full"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>}
              </div>
              <div className="p-3">
                <p className="font-medium text-sm truncate">{img.title}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{img.category || "Uncategorized"}</p>
                  {img.revealImageUrl ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">Pair ✓</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">No reveal</span>
                  )}
                </div>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setViewItem(img)}><Eye className="h-3 w-3" /></Button>
                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => openEdit(img)}><Pencil className="h-3 w-3" /></Button>
                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => setDeleteId(img.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen || !!editItem} onOpenChange={() => { setCreateOpen(false); setEditItem(null); resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Image Pair" : "Add Game Image Pair"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Soccer Kick Scene" /></div>
            <div><Label>Category</Label>
              <Select value={form.gameCategory} onValueChange={(v) => setForm({ ...form, gameCategory: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Game Image (no ball) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Game Image (No Ball) *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/50 transition-colors">
                  {gameFile ? (
                    <div className="space-y-2">
                      <img src={URL.createObjectURL(gameFile)} alt="Game preview" className="h-24 w-full object-cover rounded" />
                      <p className="text-xs text-muted-foreground truncate">{gameFile.name}</p>
                      <Button variant="outline" size="sm" onClick={() => setGameFile(null)}>Remove</Button>
                    </div>
                  ) : editItem?.imageUrl && !gameFile ? (
                    <div className="space-y-2">
                      <img src={editItem.imageUrl} alt="Current" className="h-24 w-full object-cover rounded" />
                      <p className="text-xs text-muted-foreground">Current image</p>
                      <label className="cursor-pointer">
                        <span className="text-xs text-primary underline">Replace</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setGameFile(e.target.files[0]); }} />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <span className="text-sm text-muted-foreground">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setGameFile(e.target.files[0]); }} />
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Shown to players during the game</p>
              </div>

              {/* Reveal Image (with ball) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Reveal Image (With Ball) *</Label>
                <div className="border-2 border-dashed border-orange-300 rounded-lg p-3 text-center hover:border-orange-400 transition-colors bg-orange-50/30">
                  {revealFile ? (
                    <div className="space-y-2">
                      <img src={URL.createObjectURL(revealFile)} alt="Reveal preview" className="h-24 w-full object-cover rounded" />
                      <p className="text-xs text-muted-foreground truncate">{revealFile.name}</p>
                      <Button variant="outline" size="sm" onClick={() => setRevealFile(null)}>Remove</Button>
                    </div>
                  ) : editItem?.revealImageUrl && !revealFile ? (
                    <div className="space-y-2">
                      <img src={editItem.revealImageUrl} alt="Current reveal" className="h-24 w-full object-cover rounded" />
                      <p className="text-xs text-muted-foreground">Current reveal</p>
                      <label className="cursor-pointer">
                        <span className="text-xs text-primary underline">Replace</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setRevealFile(e.target.files[0]); }} />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      <Upload className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                      <span className="text-sm text-orange-600">Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setRevealFile(e.target.files[0]); }} />
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-orange-700">🔒 Hidden from admins — revealed only when game ends</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditItem(null); resetForm(); }}>Cancel</Button>
            <Button onClick={editItem ? handleEdit : handleCreate} disabled={saving}>{saving ? "Uploading..." : editItem ? "Update Pair" : "Add Image Pair"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog — super admin can see both images */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Game Image (No Ball)</p>
                  {viewItem.imageUrl ? <img src={viewItem.imageUrl} className="w-full rounded-lg" alt="Game" />
                    : <div className="h-32 bg-muted rounded-lg flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>}
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-700 mb-1">🔒 Reveal Image (With Ball)</p>
                  {viewItem.revealImageUrl ? <img src={viewItem.revealImageUrl} className="w-full rounded-lg border-2 border-orange-200" alt="Reveal" />
                    : <div className="h-32 bg-orange-50 rounded-lg flex items-center justify-center border-2 border-dashed border-orange-200"><p className="text-xs text-orange-400">No reveal uploaded</p></div>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Category: {viewItem.category || "Uncategorized"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Image Pair</AlertDialogTitle><AlertDialogDescription>This will permanently delete both the game image and its reveal image.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
