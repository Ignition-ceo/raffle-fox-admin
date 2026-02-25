import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { StatusPill } from "./StatusPill";
import { Skeleton } from "@/components/ui/skeleton";
import { type Prize } from "@/lib/firestore";

interface InventoryListProps {
  prizes?: Prize[];
  loading?: boolean;
}

export function InventoryList({ prizes, loading }: InventoryListProps) {
  const defaultItems = [
    { name: "Macbook Pro", quantity: 3, stockLevel: "low" as const, thumbnail: "" },
    { name: "iPhone 17", quantity: 17, stockLevel: "medium" as const, thumbnail: "" },
    { name: "50k Dollar", quantity: 15, stockLevel: "medium" as const, thumbnail: "" },
    { name: "5 Country Tour", quantity: 10, stockLevel: "low" as const, thumbnail: "" },
  ];

  const items = prizes && prizes.length > 0
    ? prizes.map((prize) => ({
        name: prize.prizeName,
        quantity: prize.stockLevel || 0,
        stockLevel: ((prize.stockLevel || 0) <= 3 ? "low" : "medium") as "low" | "medium" | "high",
        thumbnail: prize.thumbnail || "",
      }))
    : defaultItems;

  return (
    <Card className="p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Inventory Stock</h3>
        <Link
          to="/prizes"
          className="text-sm text-primary hover:text-primary/80 font-medium"
        >
          See All
        </Link>
      </div>
      <div className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-md bg-secondary/50"
            >
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.name}
                  className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {item.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Remaining Quantity: {item.quantity}
                </p>
              </div>
              <StatusPill status={item.stockLevel} />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
