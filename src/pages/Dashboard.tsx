import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Activity, DollarSign, TrendingDown, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { InventoryList } from "@/components/dashboard/InventoryList";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  onRafflesChange,
  onLiveRafflesCount,
  onTotalTicketsSold,
  onUsersCount,
  onLowStockPrizes,
  getLowStockCount,
  type Raffle,
  type Prize,
} from "@/lib/firestore";

function formatTimeRemaining(endAt: Date): string {
  const now = new Date();
  const diff = endAt.getTime() - now.getTime();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${mins}m`;
}

const columns = [
  { key: "title", header: "Game Name" },
  { key: "ticketSold", header: "Tickets Sold" },
  {
    key: "prizeName",
    header: "Prize",
    render: (v: string, row: any) => (
      <div className="flex items-center gap-2">
        {row.picture && (
          <img src={row.picture} alt="" className="h-7 w-7 rounded object-cover flex-shrink-0" />
        )}
        <span className="truncate max-w-[150px]">{v || row.description || "—"}</span>
      </div>
    ),
  },
  { key: "timeToEnd", header: "Time to End" },
  {
    key: "computedStatus",
    header: "Status",
    render: (value: string) => <StatusPill status={value as any} />,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    liveGames: 0,
    totalSales: 0,
    lowStock: 0,
    users: 0,
  });
  const [raffles, setRaffles] = useState<any[]>([]);
  const [lowStockPrizes, setLowStockPrizes] = useState<Prize[]>([]);

  useEffect(() => {
    // Real-time listeners — each returns an unsubscribe function
    const unsubs: (() => void)[] = [];

    // Live games count
    unsubs.push(
      onLiveRafflesCount((count) => {
        setStats((prev) => ({ ...prev, liveGames: count }));
        setLoading(false);
      })
    );

    // Total tickets sold
    unsubs.push(
      onTotalTicketsSold((count) => {
        setStats((prev) => ({ ...prev, totalSales: count }));
      })
    );

    // Users count
    unsubs.push(
      onUsersCount((count) => {
        setStats((prev) => ({ ...prev, users: count }));
      })
    );

    // Raffles for games table
    unsubs.push(
      onRafflesChange((data) => {
        setRaffles(
          data.map((raffle) => ({
            ...raffle,
            timeToEnd: formatTimeRemaining(raffle.expiryDate),
          }))
        );
      })
    );

    // Low stock prizes
    unsubs.push(
      onLowStockPrizes((prizes) => {
        setLowStockPrizes(prizes);
        setStats((prev) => ({ ...prev, lowStock: prizes.length }));
      })
    );

    // Cleanup all listeners on unmount
    return () => unsubs.forEach((fn) => fn());
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of games, sales, inventory and users"
        actions={
          <Button onClick={() => navigate("/games")}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        }
      />

      {/* Stats Row — these update in real-time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </>
        ) : (
          <>
            <StatCard label="Live Games" value={String(stats.liveGames)} icon={Activity} />
            <StatCard label="Total Game Sales" value={String(stats.totalSales)} icon={DollarSign} />
            <StatCard label="Low Stock Items" value={String(stats.lowStock)} icon={TrendingDown} />
            <StatCard label="Users" value={String(stats.users)} icon={Users} />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-12 lg:col-span-8">
          <RevenueChart />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <InventoryList prizes={lowStockPrizes} loading={loading} />
        </div>
      </div>

      {/* Games Table — updates in real-time */}
      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Games</h3>
          <Button onClick={() => navigate("/games")}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <DataTable columns={columns} data={raffles} />
        )}
      </Card>
    </AppShell>
  );
}
