import { useEffect, useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DataTable } from "@/components/dashboard/DataTable";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPrizes, type Prize } from "@/lib/firestore";
import { CreatePrizeModal } from "@/components/prizes/CreatePrizeModal";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

const columns = [
  { key: "prizeName", header: "Prize Name" },
  { key: "keyDetails", header: "Key Details" },
  { key: "prizeValue", header: "Prize Value" },
  { key: "sponsorName", header: "Sponsor" },
  { key: "stockLevel", header: "Stock Level" },
  {
    key: "status",
    header: "Status",
    render: (value: string) => <StatusPill status={value as any} />,
  },
];

export default function Prizes() {
  const [loading, setLoading] = useState(true);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchPrizes = async () => {
    setLoading(true);
    try {
      const data = await getPrizes();
      setPrizes(
        data.map((prize) => ({
          ...prize,
          prizeValue: formatCurrency(prize.prizeValue),
        }))
      );
    } catch (error) {
      console.error("Error fetching prizes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrizes();
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Prize Database"
        subtitle="Manage prizes, stock, sponsors and availability"
        actions={
          <>
            <Button variant="outline">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </>
        }
      />

      <CreatePrizeModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchPrizes}
      />

      <Card className="p-5 shadow-sm">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <DataTable columns={columns} data={prizes} />
        )}
      </Card>
    </AppShell>
  );
}
