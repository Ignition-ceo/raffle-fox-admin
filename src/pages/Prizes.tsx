import { useEffect, useState } from "react";
import { Plus, SlidersHorizontal, Trash2, Eye, Power, PowerOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable, type BulkAction } from "@/components/dashboard/DataTable";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { CreatePrizeModal } from "@/components/prizes/CreatePrizeModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { onPrizesChange, deletePrize, updatePrize, type Prize } from "@/lib/firestore";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
}

const prizeBulkActions: BulkAction[] = [
  { key: "view", label: "View", icon: <Eye className="h-3.5 w-3.5" />, variant: "default" },
  { key: "activate", label: "Activate", icon: <Power className="h-3.5 w-3.5" />, variant: "default" },
  { key: "deactivate", label: "Deactivate", icon: <PowerOff className="h-3.5 w-3.5" />, variant: "default" },
  { key: "delete", label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, variant: "destructive" },
];

export default function Prizes() {
  const [loading, setLoading] = useState(true);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Prize | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Bulk action state
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [bulkViewItems, setBulkViewItems] = useState<Prize[]>([]);
  const [bulkActivateIds, setBulkActivateIds] = useState<string[]>([]);
  const [bulkDeactivateIds, setBulkDeactivateIds] = useState<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    const unsub = onPrizesChange((data) => { setPrizes(data); setLoading(false); });
    return unsub;
  }, []);

  // ── Single Delete (2-step: button → confirmation dialog) ──
  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deletePrize(deleteId); toast({ title: "Prize deleted successfully" }); setDeleteId(null); }
    catch { toast({ variant: "destructive", title: "Failed to delete prize" }); }
  };

  // ── Bulk Action Handlers — all destructive actions are 2-step ──
  const handleBulkAction = (actionKey: string, selectedIds: string[]) => {
    switch (actionKey) {
      case "delete":
        setBulkDeleteIds(selectedIds);
        break;
      case "view": {
        const items = prizes.filter((p) => selectedIds.includes(p.id));
        setBulkViewItems(items);
        break;
      }
      case "activate":
        setBulkActivateIds(selectedIds);
        break;
      case "deactivate":
        setBulkDeactivateIds(selectedIds);
        break;
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(bulkDeleteIds.map((id) => deletePrize(id)));
      toast({ title: `${bulkDeleteIds.length} prize${bulkDeleteIds.length > 1 ? "s" : ""} deleted` });
      setBulkDeleteIds([]);
    } catch { toast({ variant: "destructive", title: "Some deletes failed" }); }
  };

  const handleBulkActivate = async () => {
    try {
      await Promise.all(bulkActivateIds.map((id) => updatePrize(id, { status: "Active" })));
      toast({ title: `${bulkActivateIds.length} prize${bulkActivateIds.length > 1 ? "s" : ""} activated` });
      setBulkActivateIds([]);
    } catch { toast({ variant: "destructive", title: "Some updates failed" }); }
  };

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(bulkDeactivateIds.map((id) => updatePrize(id, { status: "Inactive" })));
      toast({ title: `${bulkDeactivateIds.length} prize${bulkDeactivateIds.length > 1 ? "s" : ""} deactivated` });
      setBulkDeactivateIds([]);
    } catch { toast({ variant: "destructive", title: "Some updates failed" }); }
  };

  const columns = [
    { key: "prizeName", header: "Prize Name" },
    { key: "keyDetails", header: "Key Details" },
    { key: "prizeValue", header: "Prize Value", render: (v: number) => formatCurrency(v || 0) },
    {
      key: "stockLevel", header: "Stock Level",
      render: (v: number) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={Math.min(v || 0, 100)} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-6 text-right">{v || 0}</span>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (v: string) => <StatusPill status={v} /> },
    {
      key: "actions", header: "",
      render: (_: any, row: Prize) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader title="Prize Database" subtitle="Manage prizes, stock, sponsors and availability"
        actions={<>
          <Button variant="outline"><SlidersHorizontal className="h-4 w-4 mr-2" />Filter</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create New</Button>
        </>} />
      <Card className="p-5 shadow-sm">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <DataTable columns={columns} data={prizes} bulkActions={prizeBulkActions} onBulkAction={handleBulkAction} />
        )}
      </Card>

      <CreatePrizeModal open={createOpen} onOpenChange={setCreateOpen} />

      {/* ── Single View Dialog ── */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{viewItem?.prizeName}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-3 text-sm">
              {viewItem.thumbnail && (
                <img src={viewItem.thumbnail} alt={viewItem.prizeName} className="w-full h-40 object-cover rounded-lg" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Value:</span> {formatCurrency(viewItem.prizeValue || 0)}</div>
                <div><span className="text-muted-foreground">Stock:</span> {viewItem.stockLevel}</div>
                <div><span className="text-muted-foreground">Category:</span> {viewItem.prizeCategory || "N/A"}</div>
                <div><span className="text-muted-foreground">Status:</span> <StatusPill status={viewItem.status} /></div>
                <div><span className="text-muted-foreground">Fulfillment:</span> {viewItem.fulfillmentMethod || "N/A"}</div>
                <div><span className="text-muted-foreground">Age Restriction:</span> {viewItem.ageRestriction || "N/A"}</div>
              </div>
              {viewItem.fullDescription && (
                <div><span className="text-muted-foreground">Description:</span> {viewItem.fullDescription}</div>
              )}
              {viewItem.keywords && viewItem.keywords.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {viewItem.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{kw}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk View Dialog ── */}
      <Dialog open={bulkViewItems.length > 0} onOpenChange={() => setBulkViewItems([])}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Viewing {bulkViewItems.length} Prize{bulkViewItems.length > 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bulkViewItems.map((prize) => (
              <div key={prize.id} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  {prize.thumbnail && (
                    <img src={prize.thumbnail} alt={prize.prizeName} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{prize.prizeName}</h3>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div><span className="text-muted-foreground">Value:</span> {formatCurrency(prize.prizeValue || 0)}</div>
                      <div><span className="text-muted-foreground">Stock:</span> {prize.stockLevel}</div>
                      <div><StatusPill status={prize.status} /></div>
                    </div>
                    {prize.keyDetails && (
                      <p className="text-xs text-muted-foreground mt-1">{prize.keyDetails}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Single Delete (2-step confirmation) ── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prize</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this prize and remove it from any associated sponsors. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Delete (2-step confirmation) ── */}
      <AlertDialog open={bulkDeleteIds.length > 0} onOpenChange={() => setBulkDeleteIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {bulkDeleteIds.length} Prize{bulkDeleteIds.length > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the selected prizes and remove them from any associated sponsors. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Activate (2-step confirmation) ── */}
      <AlertDialog open={bulkActivateIds.length > 0} onOpenChange={() => setBulkActivateIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate {bulkActivateIds.length} Prize{bulkActivateIds.length > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>These prizes will be set to active and available for use in games.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkActivate}>Activate All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Deactivate (2-step confirmation) ── */}
      <AlertDialog open={bulkDeactivateIds.length > 0} onOpenChange={() => setBulkDeactivateIds([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {bulkDeactivateIds.length} Prize{bulkDeactivateIds.length > 1 ? "s" : ""}</AlertDialogTitle>
            <AlertDialogDescription>These prizes will be deactivated and no longer available for new games.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeactivate}>Deactivate All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
