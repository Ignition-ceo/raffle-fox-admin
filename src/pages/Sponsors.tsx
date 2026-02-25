import { useEffect, useState } from "react";
import { Plus, Eye, Trash2, Building2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SponsorCard } from "@/components/dashboard/SponsorCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { onSponsorsChange, createSponsor, deleteSponsor, type Sponsor } from "@/lib/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Sponsors() {
  const [loading, setLoading] = useState(true);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Sponsor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ sponsorName: "", website: "" });
  const [logoFiles, setLogoFiles] = useState<File[]>([]);

  useEffect(() => {
    const unsub = onSponsorsChange((data) => { setSponsors(data); setLoading(false); });
    return unsub;
  }, []);

  const handleCreate = async () => {
    if (!form.sponsorName) { toast({ variant: "destructive", title: "Sponsor name is required" }); return; }
    setSaving(true);
    try {
      let logoUrls: string[] = [];
      if (logoFiles.length > 0) {
        const storage = getStorage();
        for (const file of logoFiles) {
          const storageRef = ref(storage, `sponsors/logo_${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          logoUrls.push(await getDownloadURL(storageRef));
        }
      }
      await createSponsor({ sponsorName: form.sponsorName, logo: logoUrls, website: form.website });
      toast({ title: "Sponsor created!" });
      setCreateOpen(false); setForm({ sponsorName: "", website: "" }); setLogoFiles([]);
    } catch { toast({ variant: "destructive", title: "Failed to create sponsor" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteSponsor(deleteId); toast({ title: "Sponsor deactivated" }); setDeleteId(null); }
    catch { toast({ variant: "destructive", title: "Failed to delete" }); }
  };

  return (
    <AppShell>
      <PageHeader title="Sponsor Library" subtitle="Manage sponsors and partnerships"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Sponsor</Button>} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : sponsors.length === 0 ? (
        <Card className="p-12 text-center"><Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No active sponsors.</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map((s) => (
            <div key={s.id} className="relative group">
              <SponsorCard sponsor={{ id: s.id, name: s.name, logoUrl: s.logoUrl, website: s.website || "", status: s.status, createdAt: s.createdAt }} />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setViewItem(s)}><Eye className="h-3 w-3" /></Button>
                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Sponsor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Sponsor Name *</Label><Input value={form.sponsorName} onChange={(e) => setForm({ ...form, sponsorName: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Logo Images (max 2)</Label><input type="file" accept="image/*" multiple className="text-sm" onChange={(e) => { if (e.target.files) setLogoFiles(Array.from(e.target.files).slice(0, 2)); }} />
              {logoFiles.length > 0 && <div className="flex gap-2 mt-2">{logoFiles.map((f, i) => <img key={i} src={URL.createObjectURL(f)} className="h-12 w-12 object-cover rounded border" />)}</div>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Add Sponsor"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>{viewItem?.name}</DialogTitle></DialogHeader>
          {viewItem && <div className="space-y-3">
            {viewItem.logo.length > 0 && <div className="flex gap-3">{viewItem.logo.map((url, i) => <img key={i} src={url} className="h-20 object-contain rounded border" />)}</div>}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Games:</span> {viewItem.gamesCreation.length}</div>
              <div><span className="text-muted-foreground">Prizes:</span> {viewItem.prizesCreation.length}</div>
              {viewItem.website && <div className="col-span-2"><span className="text-muted-foreground">Website:</span> {viewItem.website}</div>}
            </div>
          </div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Deactivate Sponsor</AlertDialogTitle><AlertDialogDescription>This sponsor will be set to inactive.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Deactivate</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
