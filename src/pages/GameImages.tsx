import { useEffect, useState } from "react";
import { Plus, Eye, Trash2, Pencil, ImageIcon } from "lucide-react";
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
import { onGameImagesChange, createGameImage, updateGameImage, deleteGameImage, type GameImage } from "@/lib/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function GameImages() {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<GameImage[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<GameImage | null>(null);
  const [editItem, setEditItem] = useState<GameImage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ title: "", gameCategory: "", imageUrl: "" });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const unsub = onGameImagesChange((data) => { setImages(data); setLoading(false); });
    return unsub;
  }, []);

  const resetForm = () => { setForm({ title: "", gameCategory: "", imageUrl: "" }); setFile(null); };

  const handleCreate = async () => {
    if (!form.title) { toast({ variant: "destructive", title: "Title is required" }); return; }
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (file) {
        const storage = getStorage();
        const storageRef = ref(storage, `game_images/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
      }
      await createGameImage({ title: form.title, gameCategory: form.gameCategory, imageUrl });
      toast({ title: "Image added!" });
      setCreateOpen(false); resetForm();
    } catch { toast({ variant: "destructive", title: "Failed to add image" }); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (file) {
        const storage = getStorage();
        const storageRef = ref(storage, `game_images/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
      }
      await updateGameImage(editItem.id, { title: form.title, gameCategory: form.gameCategory, imageUrl });
      toast({ title: "Image updated!" });
      setEditItem(null); resetForm();
    } catch { toast({ variant: "destructive", title: "Failed to update" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteGameImage(deleteId); toast({ title: "Image deleted" }); setDeleteId(null); }
    catch { toast({ variant: "destructive", title: "Delete failed" }); }
  };

  const openEdit = (img: GameImage) => {
    setForm({ title: img.title, gameCategory: img.category || "", imageUrl: img.imageUrl });
    setEditItem(img);
  };

  const categories = ["Puzzle", "Action", "Strategy", "Racing", "Sports", "Card Game", "Other"];

  return (
    <AppShell>
      <PageHeader title="Game Images" subtitle="Manage the game image library"
        actions={<Button onClick={() => { resetForm(); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Image</Button>} />

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
                <p className="text-xs text-muted-foreground">{img.category || "Uncategorized"}</p>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Image" : "Add Game Image"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Image title" /></div>
            <div><Label>Category</Label>
              <Select value={form.gameCategory} onValueChange={(v) => setForm({ ...form, gameCategory: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Upload Image</Label><input type="file" accept="image/*" className="text-sm" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} /></div>
            {!file && <div><Label>Or Image URL</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." /></div>}
            {(file || form.imageUrl) && (
              <div className="rounded-lg border overflow-hidden"><img src={file ? URL.createObjectURL(file) : form.imageUrl} className="w-full h-32 object-cover" alt="Preview" /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={editItem ? handleEdit : handleCreate} disabled={saving}>{saving ? "Saving..." : editItem ? "Update" : "Add Image"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{viewItem?.title}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3">
              {viewItem.imageUrl && <img src={viewItem.imageUrl} className="w-full rounded-lg" alt={viewItem.title} />}
              <p className="text-sm text-muted-foreground">Category: {viewItem.category || "Uncategorized"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Image</AlertDialogTitle><AlertDialogDescription>This will permanently delete this game image.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
