import { useEffect, useState } from "react";
import { Plus, SlidersHorizontal, Trash2, Eye } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
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
import { onPrizesChange, deletePrize, type Prize } from "@/lib/firestore";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
}

export default function Prizes() {
  const [loading, setLoading] = useState(true);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewItem, setViewItem] = useState<Prize | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onPrizesChange((data) => {
      setPrizes(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePrize(deleteId);
      toast({ title: "Prize deleted successfully" });
      setDeleteId(null);
    } catch { toast({ variant: "destructive", title: "Failed to delete prize" }); }
  };

  const columns = [
    { key: "prizeName", header: "Prize Name" },
    { key: "keyDetails", header: "Key Details" },
    {
      key: "prizeValue",
      header: "Prize Value",
      render: (v: number) => formatCurrency(v || 0),
    },
    {
      key: "stockLevel",
      header: "Stock Level",
      render: (v: number) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <Progress value={Math.min(v || 0, 100)} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground w-6 text-right">{v || 0}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v: string) => <StatusPill status={v} />,
    },
    {
      key: "actions",
      header: "",
      render: (_: any, row: Prize) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(row)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Prize Database"
        subtitle="Manage prizes, stock, sponsors and availability"
        actions={
          <>
            <Button variant="outline"><SlidersHorizontal className="h-4 w-4 mr-2" />Filter</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create New</Button>
          </>
        }
      />
      <Card className="p-5 shadow-sm">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : (
          <DataTable columns={columns} data={prizes} />
        )}
      </Card>

      <CreatePrizeModal open={createOpen} onOpenChange={setCreateOpen} />

      {/* View Dialog */}
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

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prize</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this prize and remove it from any associated sponsors.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
