import { useEffect, useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, Users, Ticket, ArrowUpRight, ArrowDownRight,
  ChevronRight, Eye, CheckCircle2, Clock, AlertCircle, Search,
  Download, Filter, CreditCard, Coins, ArrowLeft, FileText, X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  onRafflesChange, onSponsorsChange, updateRaffle,
  type Raffle, type Sponsor,
} from "@/lib/firestore";

// ── Constants ──
const COIN_TO_FIAT = 1.5; // 1 Gold Coin = $1.50 USD
const SPONSOR_SPLIT = 0.7; // 70% to sponsor
const RF_SPLIT = 0.3; // 30% to RaffleFox
const PAYOUT_DAYS = 7; // days after game close

// ── Financial Status Logic ──
type FinancialStatus = "active" | "pending_payout" | "payout_in_progress" | "completed" | "refunded";

function getFinancialStatus(raffle: Raffle): FinancialStatus {
  const s = (raffle.computedStatus || raffle.status || "").toLowerCase();
  const fs = ((raffle as any).financialStatus || "").toLowerCase();

  if (fs === "completed" || fs === "transactions_completed") return "completed";
  if (fs === "payout_in_progress") return "payout_in_progress";
  if (s === "refunded") return "refunded";
  if (s === "live" || s === "active") return "active";
  // Game ended but financials not closed
  return "pending_payout";
}

function financialStatusLabel(status: FinancialStatus): string {
  switch (status) {
    case "active": return "Active";
    case "pending_payout": return "Pending Payout";
    case "payout_in_progress": return "Payout In Progress";
    case "completed": return "Completed";
    case "refunded": return "Refunded";
  }
}

function financialStatusColor(status: FinancialStatus): string {
  switch (status) {
    case "active": return "bg-blue-100 text-blue-700";
    case "pending_payout": return "bg-amber-100 text-amber-700";
    case "payout_in_progress": return "bg-orange-100 text-orange-700";
    case "completed": return "bg-emerald-100 text-emerald-700";
    case "refunded": return "bg-red-100 text-red-700";
  }
}

// ── Helpers ──
function fmtCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(val);
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function fmtCoins(val: number): string {
  return `${val.toLocaleString()} GC`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

interface GameFinancials {
  raffle: Raffle;
  ticketsSold: number;
  ticketPriceCoins: number;
  totalCoins: number;
  totalFiat: number;
  sponsorPayout: number;
  rfRetention: number;
  financialStatus: FinancialStatus;
  payoutDate: Date | null;
  sponsorName: string;
}

function calcGameFinancials(raffle: Raffle, sponsors: Sponsor[]): GameFinancials {
  const ticketsSold = raffle.ticketSold || (raffle as any).ticketsSold || 0;
  const ticketPriceCoins = raffle.ticketPrice || 0;
  const totalCoins = ticketsSold * ticketPriceCoins;
  const totalFiat = totalCoins * COIN_TO_FIAT;
  const sponsorPayout = totalFiat * SPONSOR_SPLIT;
  const rfRetention = totalFiat * RF_SPLIT;
  const financialStatus = getFinancialStatus(raffle);
  const isEnded = !["live", "active"].includes((raffle.computedStatus || raffle.status || "").toLowerCase());
  const payoutDate = isEnded ? addDays(raffle.expiryDate, PAYOUT_DAYS) : null;
  const sponsor = sponsors.find((s) => s.id === raffle.sponsorId);
  const sponsorName = sponsor?.sponsorName || sponsor?.name || "Unknown";

  return { raffle, ticketsSold, ticketPriceCoins, totalCoins, totalFiat, sponsorPayout, rfRetention, financialStatus, payoutDate, sponsorName };
}

// ══════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════
export default function FinancialManagement() {
  const [loading, setLoading] = useState(true);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedGame, setSelectedGame] = useState<GameFinancials | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmPayoutGame, setConfirmPayoutGame] = useState<GameFinancials | null>(null);
  const [confirmCompleteGame, setConfirmCompleteGame] = useState<GameFinancials | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const unsub1 = onRafflesChange((data) => { setRaffles(data); setLoading(false); });
    const unsub2 = onSponsorsChange(setSponsors);
    return () => { unsub1(); unsub2(); };
  }, []);

  // ── Computed financials ──
  const allGameFinancials = useMemo(() =>
    raffles.map((r) => calcGameFinancials(r, sponsors)),
    [raffles, sponsors]
  );

  const filteredGames = useMemo(() => {
    let games = allGameFinancials;
    if (statusFilter !== "all") games = games.filter((g) => g.financialStatus === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      games = games.filter((g) => g.raffle.title.toLowerCase().includes(q) || g.sponsorName.toLowerCase().includes(q));
    }
    return games;
  }, [allGameFinancials, statusFilter, searchTerm]);

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const totalRevenueFiat = allGameFinancials.reduce((s, g) => s + g.totalFiat, 0);
    const totalRevenueCoins = allGameFinancials.reduce((s, g) => s + g.totalCoins, 0);
    const totalSponsorPayouts = allGameFinancials.reduce((s, g) => s + g.sponsorPayout, 0);
    const totalRfRetention = allGameFinancials.reduce((s, g) => s + g.rfRetention, 0);
    const pendingPayouts = allGameFinancials.filter((g) => g.financialStatus === "pending_payout").length;
    const inProgress = allGameFinancials.filter((g) => g.financialStatus === "payout_in_progress").length;
    const completed = allGameFinancials.filter((g) => g.financialStatus === "completed").length;
    const totalTickets = allGameFinancials.reduce((s, g) => s + g.ticketsSold, 0);
    return { totalRevenueFiat, totalRevenueCoins, totalSponsorPayouts, totalRfRetention, pendingPayouts, inProgress, completed, totalTickets };
  }, [allGameFinancials]);

  // ── Actions ──
  const handleStartPayout = async (game: GameFinancials) => {
    try {
      await updateRaffle(game.raffle.id, { financialStatus: "payout_in_progress" });
      toast({ title: "Payout started", description: `${game.raffle.title} marked as Payout In Progress` });
      setConfirmPayoutGame(null);
    } catch { toast({ variant: "destructive", title: "Failed to update" }); }
  };

  const handleCompletePayout = async (game: GameFinancials) => {
    try {
      await updateRaffle(game.raffle.id, { financialStatus: "transactions_completed" });
      toast({ title: "Game financially closed", description: `${game.raffle.title} — all transactions completed` });
      setConfirmCompleteGame(null);
      setSelectedGame(null);
    } catch { toast({ variant: "destructive", title: "Failed to update" }); }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Financial Management" subtitle="Loading..." />
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="h-96" />
        </div>
      </AppShell>
    );
  }

  // ── Game Detail View ──
  if (selectedGame) {
    return (
      <AppShell>
        <GameFinancialDetail
          game={selectedGame}
          onBack={() => setSelectedGame(null)}
          onStartPayout={() => setConfirmPayoutGame(selectedGame)}
          onCompletePayout={() => setConfirmCompleteGame(selectedGame)}
        />
        <AlertDialog open={!!confirmPayoutGame} onOpenChange={() => setConfirmPayoutGame(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Payout Process</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark "{confirmPayoutGame?.raffle.title}" as Payout In Progress.
                Sponsor payout: {fmtCurrency(confirmPayoutGame?.sponsorPayout || 0)} to {confirmPayoutGame?.sponsorName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmPayoutGame && handleStartPayout(confirmPayoutGame)}>Start Payout</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!confirmCompleteGame} onOpenChange={() => setConfirmCompleteGame(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm All Transactions Completed</AlertDialogTitle>
              <AlertDialogDescription>
                This will formally close "{confirmCompleteGame?.raffle.title}". Confirm that all payouts have been made and amounts are correct. This action generates the final financial report.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmCompleteGame && handleCompletePayout(confirmCompleteGame)} className="bg-emerald-600 hover:bg-emerald-700">Confirm Complete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Financial Management" subtitle="Track revenue, payouts, and game financials" />

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={DollarSign} label="Total Revenue" value={fmtCurrency(stats.totalRevenueFiat)} sub={fmtCoins(stats.totalRevenueCoins)} color="text-emerald-600" bg="bg-emerald-50" />
        <SummaryCard icon={ArrowUpRight} label="Sponsor Payouts" value={fmtCurrency(stats.totalSponsorPayouts)} sub={`70% of revenue`} color="text-blue-600" bg="bg-blue-50" />
        <SummaryCard icon={TrendingUp} label="RF Retention" value={fmtCurrency(stats.totalRfRetention)} sub={`30% of revenue`} color="text-orange-600" bg="bg-orange-50" />
        <SummaryCard icon={Ticket} label="Total Tickets Sold" value={stats.totalTickets.toLocaleString()} sub={`Across ${allGameFinancials.length} games`} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* ── Status Breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <StatusCard label="Active Games" count={allGameFinancials.filter((g) => g.financialStatus === "active").length} color="bg-blue-500" />
        <StatusCard label="Pending Payout" count={stats.pendingPayouts} color="bg-amber-500" />
        <StatusCard label="Payouts In Progress" count={stats.inProgress} color="bg-orange-500" />
        <StatusCard label="Completed" count={stats.completed} color="bg-emerald-500" />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">All Games</TabsTrigger>
          <TabsTrigger value="pending">Pending Payouts ({stats.pendingPayouts})</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by game or sponsor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_payout">Pending Payout</SelectItem>
                  <SelectItem value="payout_in_progress">Payout In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead>Game</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Revenue (Coins)</TableHead>
                    <TableHead className="text-right">Revenue (Fiat)</TableHead>
                    <TableHead className="text-right">Sponsor Payout</TableHead>
                    <TableHead className="text-right">RF Retention</TableHead>
                    <TableHead>Financial Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No games found.</TableCell></TableRow>
                  ) : filteredGames.map((game) => (
                    <TableRow key={game.raffle.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedGame(game)}>
                      <TableCell className="font-medium">{game.raffle.title}</TableCell>
                      <TableCell className="text-muted-foreground">{game.sponsorName}</TableCell>
                      <TableCell className="text-right">{game.ticketsSold}</TableCell>
                      <TableCell className="text-right">{fmtCoins(game.totalCoins)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtCurrency(game.totalFiat)}</TableCell>
                      <TableCell className="text-right text-blue-600">{fmtCurrency(game.sponsorPayout)}</TableCell>
                      <TableCell className="text-right text-orange-600">{fmtCurrency(game.rfRetention)}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${financialStatusColor(game.financialStatus)}`}>
                          {financialStatusLabel(game.financialStatus)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card className="p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Games Awaiting Financial Action</h3>
            <div className="space-y-3">
              {allGameFinancials.filter((g) => g.financialStatus === "pending_payout" || g.financialStatus === "payout_in_progress").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
                  <p>All payouts are up to date!</p>
                </div>
              ) : allGameFinancials
                  .filter((g) => g.financialStatus === "pending_payout" || g.financialStatus === "payout_in_progress")
                  .map((game) => (
                    <div key={game.raffle.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${game.financialStatus === "pending_payout" ? "bg-amber-50" : "bg-orange-50"}`}>
                          {game.financialStatus === "pending_payout" ? <Clock className="h-5 w-5 text-amber-600" /> : <ArrowUpRight className="h-5 w-5 text-orange-600" />}
                        </div>
                        <div>
                          <p className="font-medium">{game.raffle.title}</p>
                          <p className="text-xs text-muted-foreground">Sponsor: {game.sponsorName} · Payout due: {game.payoutDate ? fmtDate(game.payoutDate) : "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">{fmtCurrency(game.sponsorPayout)}</p>
                          <p className="text-xs text-muted-foreground">Sponsor payout</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${financialStatusColor(game.financialStatus)}`}>
                          {financialStatusLabel(game.financialStatus)}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => setSelectedGame(game)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Details
                        </Button>
                      </div>
                    </div>
                  ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Transaction Log</h3>
              <p className="text-xs text-muted-foreground">Coin purchases, refunds, and payouts</p>
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Coins</TableHead>
                    <TableHead className="text-right">Fiat Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allGameFinancials
                    .filter((g) => g.ticketsSold > 0)
                    .sort((a, b) => b.raffle.createdAt.getTime() - a.raffle.createdAt.getTime())
                    .map((game) => (
                      <TableRow key={game.raffle.id}>
                        <TableCell className="text-sm">{fmtDate(game.raffle.createdAt)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm">
                            <Coins className="h-3.5 w-3.5 text-amber-500" /> Ticket Sales
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{game.raffle.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{game.ticketsSold} tickets × {game.ticketPriceCoins} GC</TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmtCoins(game.totalCoins)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmtCurrency(game.totalFiat)}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${financialStatusColor(game.financialStatus)}`}>
                            {financialStatusLabel(game.financialStatus)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  {allGameFinancials.filter((g) => g.ticketsSold > 0).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No transactions recorded yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

// ══════════════════════════════════════════════════
//  GAME FINANCIAL DETAIL
// ══════════════════════════════════════════════════
function GameFinancialDetail({ game, onBack, onStartPayout, onCompletePayout }: {
  game: GameFinancials;
  onBack: () => void;
  onStartPayout: () => void;
  onCompletePayout: () => void;
}) {
  const isEnded = !["active"].includes(game.financialStatus);
  const canStartPayout = game.financialStatus === "pending_payout";
  const canComplete = game.financialStatus === "payout_in_progress";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h2 className="text-xl font-bold">{game.raffle.title}</h2>
            <p className="text-sm text-muted-foreground">Financial Report · Sponsor: {game.sponsorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${financialStatusColor(game.financialStatus)}`}>
            {financialStatusLabel(game.financialStatus)}
          </span>
          {canStartPayout && (
            <Button onClick={onStartPayout} className="bg-blue-600 hover:bg-blue-700">
              <ArrowUpRight className="h-4 w-4 mr-2" /> Start Payout
            </Button>
          )}
          {canComplete && (
            <Button onClick={onCompletePayout} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Complete
            </Button>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Sales (Coins)</p>
          <p className="text-2xl font-bold">{fmtCoins(game.totalCoins)}</p>
          <p className="text-xs text-muted-foreground">{game.ticketsSold} tickets × {game.ticketPriceCoins} GC</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Sales (Fiat)</p>
          <p className="text-2xl font-bold text-emerald-600">{fmtCurrency(game.totalFiat)}</p>
          <p className="text-xs text-muted-foreground">@ {fmtCurrency(COIN_TO_FIAT)} per coin</p>
        </Card>
        <Card className="p-4 border-blue-200 bg-blue-50/30">
          <p className="text-xs text-blue-600 mb-1">Sponsor Payout (70%)</p>
          <p className="text-2xl font-bold text-blue-700">{fmtCurrency(game.sponsorPayout)}</p>
          <p className="text-xs text-blue-600">To: {game.sponsorName}</p>
        </Card>
        <Card className="p-4 border-orange-200 bg-orange-50/30">
          <p className="text-xs text-orange-600 mb-1">RF Retention (30%)</p>
          <p className="text-2xl font-bold text-orange-700">{fmtCurrency(game.rfRetention)}</p>
          <p className="text-xs text-orange-600">Raffle Fox revenue</p>
        </Card>
      </div>

      {/* Verification Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Sponsor Payout + RF Retention</p>
              <p className="text-sm font-semibold">{fmtCurrency(game.sponsorPayout)} + {fmtCurrency(game.rfRetention)} = <span className="text-emerald-600">{fmtCurrency(game.sponsorPayout + game.rfRetention)}</span></p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-sm font-semibold text-emerald-600">{fmtCurrency(game.totalFiat)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-emerald-600 font-medium">Balanced ✓</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Split Visualization */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Revenue Split</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-blue-600 font-medium">Sponsor Payout (70%)</span>
              <span className="font-semibold">{fmtCurrency(game.sponsorPayout)}</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: "70%" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-orange-600 font-medium">RaffleFox Retention (30%)</span>
              <span className="font-semibold">{fmtCurrency(game.rfRetention)}</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: "30%" }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Game Details */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Game Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground">Game Status:</span> <StatusPill status={game.raffle.computedStatus} /></div>
          <div><span className="text-muted-foreground">Ticket Price:</span> {game.ticketPriceCoins} Gold Coins ({fmtCurrency(game.ticketPriceCoins * COIN_TO_FIAT)})</div>
          <div><span className="text-muted-foreground">Tickets Sold:</span> {game.ticketsSold}</div>
          <div><span className="text-muted-foreground">Category:</span> {game.raffle.category || "—"}</div>
          <div><span className="text-muted-foreground">Start Date:</span> {fmtDate(game.raffle.createdAt)}</div>
          <div><span className="text-muted-foreground">End Date:</span> {fmtDate(game.raffle.expiryDate)}</div>
          <div><span className="text-muted-foreground">Sponsor:</span> {game.sponsorName}</div>
          <div>
            <span className="text-muted-foreground">Payout Due:</span>{" "}
            {game.payoutDate ? (
              <span className={new Date() > game.payoutDate ? "text-red-600 font-medium" : ""}>{fmtDate(game.payoutDate)}</span>
            ) : "—"}
          </div>
        </div>
      </Card>

      {/* Payout Timeline */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Payout Workflow</h3>
        <div className="flex items-center gap-2">
          <TimelineStep label="Game Ended" done={isEnded} />
          <div className="flex-1 h-0.5 bg-border" />
          <TimelineStep label="Pending Payout" done={game.financialStatus !== "active" && game.financialStatus !== "pending_payout"} active={game.financialStatus === "pending_payout"} />
          <div className="flex-1 h-0.5 bg-border" />
          <TimelineStep label="Payout In Progress" done={game.financialStatus === "completed"} active={game.financialStatus === "payout_in_progress"} />
          <div className="flex-1 h-0.5 bg-border" />
          <TimelineStep label="Completed" done={game.financialStatus === "completed"} />
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════
function SummaryCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: any; label: string; value: string; sub: string; color: string; bg: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
      </div>
    </Card>
  );
}

function StatusCard({ label, count, color }: { label: string; count: number; color: string; }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-lg font-bold">{count}</p>
      </div>
    </Card>
  );
}

function TimelineStep({ label, done, active }: { label: string; done?: boolean; active?: boolean; }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
        done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground"
      }`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
      </div>
      <p className={`text-[11px] text-center whitespace-nowrap ${done ? "text-emerald-600 font-medium" : active ? "text-primary font-medium" : "text-muted-foreground"}`}>{label}</p>
    </div>
  );
}
