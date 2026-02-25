import { useEffect, useState } from "react";
import { Plus, Eye, Trash2, Pencil, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { onPartnersChange, createPartner, updatePartner, deletePartner, type Partner } from "@/lib/firestore";

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function initials(name: string): string {
  return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const defaultForm = { name: "", email: "", userType: "", kycRequest: "", isBanned: "Active", phone: "", company: "" };

export default function Partners() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partner | null>(null);
  const [viewItem, setViewItem] = useState<Partner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onPartnersChange((data) => { setPartners(data); setLoading(false); });
    return unsub;
  }, []);

  const resetForm = () => setForm({ ...defaultForm });

  const handleCreate = async () => {
    if (!form.name || !form.email) { toast({ variant: "destructive", title: "Name and email required" }); return; }
    setSaving(true);
    try {
      await createPartner({ ...form, status: form.isBanned === "Active" ? "Active" : form.isBanned });
      toast({ title: "Partner created!" });
      setCreateOpen(false); resetForm();
    } catch { toast({ variant: "destructive", title: "Failed" }); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await updatePartner(editItem.id, { ...form, status: form.isBanned === "Active" ? "Active" : form.isBanned });
      toast({ title: "Partner updated!" });
      setEditItem(null); resetForm();
    } catch { toast({ variant: "destructive", title: "Failed" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deletePartner(deleteId); toast({ title: "Partner deleted" }); setDeleteId(null); }
    catch { toast({ variant: "destructive", title: "Delete failed" }); }
  };

  const openEdit = (p: Partner) => {
    setForm({ name: p.name, email: p.email, userType: p.userType || "", kycRequest: p.kycRequest || "", isBanned: p.isBanned || p.status || "Active", phone: p.phone || "", company: p.company || "" });
    setEditItem(p);
  };

  const columns = [
    {
      key: "name", header: "Partner",
      render: (v: string, row: Partner) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {row.profilePicture && <AvatarImage src={row.profilePicture} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(v)}</AvatarFallback>
          </Avatar>
          <div><p className="font-medium text-sm">{v}</p><p className="text-xs text-muted-foreground">{row.email}</p></div>
        </div>
      ),
    },
    { key: "userType", header: "Type", render: (v: string) => v || "—" },
    { key: "company", header: "Company", render: (v: string) => v || "—" },
    { key: "kycRequest", header: "KYC", render: (v: string) => v || "—" },
    { key: "created", header: "Created", render: (_: any, r: Partner) => fmtDate(r.createdAt) },
    {
      key: "status", header: "Status",
      render: (_: any, r: Partner) => <StatusPill status={r.isBanned === "true" ? "Banned" : (r.status || "Active")} />,
    },
    {
      key: "actions", header: "",
      render: (_: any, row: Partner) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Partner Management" subtitle="Manage partners and collaborations"
        actions={
          <>
            <Button variant="outline"><SlidersHorizontal className="h-4 w-4 mr-2" />Filter</Button>
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Partner</Button>
          </>
        } />
      <Card className="p-5 shadow-sm">
        {loading ? <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          : <DataTable columns={columns} data={partners} />}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen || !!editItem} onOpenChange={() => { setCreateOpen(false); setEditItem(null); resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Edit Partner" : "Add Partner"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>User Type</Label>
                <Select value={form.userType} onValueChange={(v) => setForm({ ...form, userType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent><SelectItem value="Partner">Partner</SelectItem><SelectItem value="Sponsor">Sponsor</SelectItem><SelectItem value="Affiliate">Affiliate</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>KYC Status</Label>
                <Select value={form.kycRequest} onValueChange={(v) => setForm({ ...form, kycRequest: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Verified">Verified</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.isBanned} onValueChange={(v) => setForm({ ...form, isBanned: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Suspended">Suspended</SelectItem><SelectItem value="Banned">Banned</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={editItem ? handleEdit : handleCreate} disabled={saving}>{saving ? "Saving..." : editItem ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewItem?.name}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {viewItem.email}</div>
              <div><span className="text-muted-foreground">Company:</span> {viewItem.company || "N/A"}</div>
              <div><span className="text-muted-foreground">Phone:</span> {viewItem.phone || "N/A"}</div>
              <div><span className="text-muted-foreground">Type:</span> {viewItem.userType || "N/A"}</div>
              <div><span className="text-muted-foreground">KYC:</span> {viewItem.kycRequest || "N/A"}</div>
              <div><span className="text-muted-foreground">Status:</span> <StatusPill status={viewItem.status || "Active"} /></div>
              <div><span className="text-muted-foreground">Created:</span> {fmtDate(viewItem.createdAt)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Partner</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
