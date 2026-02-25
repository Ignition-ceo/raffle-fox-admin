import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onRevenueChange, type RevenuePeriod } from "@/lib/firestore";

type ChartPoint = { label: string; revenue: number };

const fallback: Record<string, ChartPoint[]> = {
  Daily: [
    { label: "Mon", revenue: 2400 },
    { label: "Tue", revenue: 1398 },
    { label: "Wed", revenue: 3200 },
    { label: "Thu", revenue: 2780 },
    { label: "Fri", revenue: 4890 },
    { label: "Sat", revenue: 3390 },
    { label: "Sun", revenue: 4490 },
  ],
  Weekly: [
    { label: "Week 1", revenue: 12400 },
    { label: "Week 2", revenue: 15398 },
    { label: "Week 3", revenue: 18200 },
    { label: "Week 4", revenue: 21780 },
  ],
  Monthly: [
    { label: "Jan", revenue: 45000 },
    { label: "Feb", revenue: 52000 },
    { label: "Mar", revenue: 61000 },
    { label: "Apr", revenue: 58000 },
    { label: "May", revenue: 72000 },
    { label: "Jun", revenue: 85000 },
  ],
};

const periodMap: Record<string, RevenuePeriod> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function RevenueChart() {
  const [period, setPeriod] = useState<string>("daily");
  const [liveData, setLiveData] = useState<Record<string, ChartPoint[]>>({});

  // Subscribe to real-time revenue for the current period
  useEffect(() => {
    const firestorePeriod = periodMap[period];
    const unsub = onRevenueChange(firestorePeriod, ({ labels, data }) => {
      if (labels.length > 0) {
        setLiveData((prev) => ({
          ...prev,
          [firestorePeriod]: labels.map((l, i) => ({ label: l, revenue: data[i] })),
        }));
      }
    });
    return unsub;
  }, [period]);

  const firestorePeriod = periodMap[period];
  const chartData = liveData[firestorePeriod] || fallback[firestorePeriod];

  return (
    <Card className="p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">Revenue</h3>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
