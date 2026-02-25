import { useEffect, useState } from "react";
import { SlidersHorizontal, Eye, Ban, ShieldCheck, ShieldOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { onUsersChange, blockUser, unblockUser, suspendUser, type GamerUser } from "@/lib/firestore";

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function initials(name: string): string {
  return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Gamers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<GamerUser[]>([]);
  const [viewItem, setViewItem] = useState<GamerUser | null>(null);
  const [actionTarget, setActionTarget] = useState<{ user: GamerUser; action: "block" | "unblock" | "suspend" } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onUsersChange((data) => { setUsers(data); setLoading(false); });
    return unsub;
  }, []);

  const handleAction = async () => {
    if (!actionTarget) return;
    const { user, action } = actionTarget;
    try {
      if (action === "block") await blockUser(user.id);
      else if (action === "unblock") await unblockUser(user.id);
      else if (action === "suspend") await suspendUser(user.id);
      toast({ title: `User ${action === "block" ? "blocked" : action === "unblock" ? "unblocked" : "suspended"}` });
      setActionTarget(null);
    } catch { toast({ variant: "destructive", title: "Action failed" }); }
  };

  const columns = [
    {
      key: "name", header: "User",
      render: (v: string, row: GamerUser) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {(row.thumbnail || row.profilePicture) && <AvatarImage src={row.thumbnail || row.profilePicture} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(v)}</AvatarFallback>
          </Avatar>
          <div><p className="font-medium text-sm">{v}</p><p className="text-xs text-muted-foreground">{row.email}</p></div>
        </div>
      ),
    },
    { key: "access", header: "Access", render: (v: string) => v || "User" },
    { key: "kycRequest", header: "KYC", render: (v: string) => v || "—" },
    { key: "registered", header: "Registered", render: (_: any, r: GamerUser) => fmtDate(r.registrationDate) },
    { key: "status", header: "Status", render: (v: string) => <StatusPill status={v} /> },
    {
      key: "actions", header: "",
      render: (_: any, row: GamerUser) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><ShieldCheck className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.status === "Blocked" || row.status === "Banned" ? (
                <DropdownMenuItem onClick={() => setActionTarget({ user: row, action: "unblock" })}>
                  <ShieldOff className="h-4 w-4 mr-2" />Unblock
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => setActionTarget({ user: row, action: "block" })}>
                    <Ban className="h-4 w-4 mr-2" />Block
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActionTarget({ user: row, action: "suspend" })}>
                    <ShieldOff className="h-4 w-4 mr-2" />Suspend
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Gamers Management" subtitle="View and manage user accounts"
        actions={<Button variant="outline"><SlidersHorizontal className="h-4 w-4 mr-2" />Filter</Button>} />
      <Card className="p-5 shadow-sm">
        {loading ? <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          : <DataTable columns={columns} data={users} />}
      </Card>

      {/* View Profile */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>User Profile</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {(viewItem.thumbnail || viewItem.profilePicture) && <AvatarImage src={viewItem.thumbnail || viewItem.profilePicture} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials(viewItem.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{viewItem.name}</h3>
                  <p className="text-muted-foreground text-sm">{viewItem.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <StatusPill status={viewItem.status} /></div>
                <div><span className="text-muted-foreground">Access:</span> {viewItem.access || "User"}</div>
                <div><span className="text-muted-foreground">KYC:</span> {viewItem.kycRequest || "N/A"}</div>
                <div><span className="text-muted-foreground">Registered:</span> {fmtDate(viewItem.registrationDate)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation */}
      <AlertDialog open={!!actionTarget} onOpenChange={() => setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionTarget?.action === "block" ? "Block User" : actionTarget?.action === "unblock" ? "Unblock User" : "Suspend User"}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "block" ? `Block ${actionTarget.user.name}? They won't be able to access the platform.`
                : actionTarget?.action === "unblock" ? `Unblock ${actionTarget?.user.name}? They will regain access.`
                : `Suspend ${actionTarget?.user.name}? Their account will be suspended.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} className={actionTarget?.action === "unblock" ? "bg-emerald-600" : "bg-destructive text-destructive-foreground"}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
