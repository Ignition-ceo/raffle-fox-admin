import { useEffect, useState } from "react";
import { Plus, Eye, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { onAdminsChange, createAdmin, deleteAdmin, type Admin } from "@/lib/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function initials(name: string): string {
  return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Admins() {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Admin | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: "", email: "", company: "", role: "staff", phoneNumber: "", password: "" });

  useEffect(() => {
    const unsub = onAdminsChange((data) => { setAdmins(data); setLoading(false); });
    return unsub;
  }, []);

  const handleCreate = async () => {
    if (!form.fullName || !form.email || !form.password) {
      toast({ variant: "destructive", title: "Name, email and password are required" }); return;
    }
    setSaving(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await createAdmin(cred.user.uid, {
        uid: cred.user.uid, email: form.email, fullName: form.fullName,
        company: form.company, role: form.role, phoneNumber: form.phoneNumber, status: "Active",
      });
      toast({ title: "Admin created!" });
      setCreateOpen(false);
      setForm({ fullName: "", email: "", company: "", role: "staff", phoneNumber: "", password: "" });
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message || "Failed to create admin" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteAdmin(deleteId); toast({ title: "Admin deleted" }); setDeleteId(null); }
    catch { toast({ variant: "destructive", title: "Failed to delete" }); }
  };

  const columns = [
    {
      key: "name", header: "Name",
      render: (v: string, row: Admin) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {row.profilePicture && <AvatarImage src={row.profilePicture} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(v)}</AvatarFallback>
          </Avatar>
          <div><p className="font-medium text-sm">{v}</p><p className="text-xs text-muted-foreground">{row.email}</p></div>
        </div>
      ),
    },
    { key: "company", header: "Company" },
    { key: "role", header: "Role", render: (v: string) => <StatusPill status={v} /> },
    { key: "phone", header: "Phone" },
    { key: "created", header: "Created", render: (_: any, row: Admin) => formatDate(row.createdAt) },
    {
      key: "actions", header: "",
      render: (_: any, row: Admin) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Admin Management" subtitle="Manage administrator accounts"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Admin</Button>} />
      <Card className="p-5 shadow-sm">
        {loading ? <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : <DataTable columns={columns} data={admins} />}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Admin</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name *</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="staff">Staff</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="super_admin">Super Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>{viewItem?.name}</DialogTitle></DialogHeader>
          {viewItem && <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {viewItem.email}</div>
            <div><span className="text-muted-foreground">Company:</span> {viewItem.company}</div>
            <div><span className="text-muted-foreground">Role:</span> <StatusPill status={viewItem.role} /></div>
            <div><span className="text-muted-foreground">Phone:</span> {viewItem.phone || "N/A"}</div>
            <div><span className="text-muted-foreground">Created:</span> {formatDate(viewItem.createdAt)}</div>
          </div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Admin</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
