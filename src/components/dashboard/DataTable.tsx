import { ReactNode, useState, useEffect } from "react";
import { MoreHorizontal, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => ReactNode;
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  selectable?: boolean;
  pageSize?: number;
  bulkActions?: BulkAction[];
  onBulkAction?: (actionKey: string, selectedIds: string[]) => void;
}

export function DataTable({
  columns, data, selectable = true, pageSize = 10,
  bulkActions = [], onBulkAction,
}: DataTableProps) {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const hasActions = columns.some((c) => c.key === "actions");
  const totalPages = Math.ceil(data.length / pageSize);
  const rows = data.slice((page - 1) * pageSize, page * pageSize);
  const rowIds = rows.map((r) => r.id).filter(Boolean);

  // Clear selection when data changes (e.g. after delete)
  useEffect(() => {
    setSelectedIds((prev) => {
      const dataIds = new Set(data.map((d) => d.id));
      const next = new Set([...prev].filter((id) => dataIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  // Reset selection on page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (rowIds.every((id) => selectedIds.has(id))) {
      // Deselect all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rowIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rowIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const allOnPageSelected = rowIds.length > 0 && rowIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = rowIds.some((id) => selectedIds.has(id));
  const headerChecked = allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false;

  const handleBulkAction = (actionKey: string) => {
    onBulkAction?.(actionKey, [...selectedIds]);
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div>
      {/* Bulk Action Bar */}
      {selectable && selectedIds.size > 0 && bulkActions.length > 0 && (
        <div className="flex items-center justify-between bg-slate-800 text-white rounded-lg px-4 py-3 mb-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-md min-w-[24px] text-center">
              {selectedIds.size}
            </span>
            <span className="text-sm text-slate-300">
              of {data.length} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions.map((action) => (
              <Button
                key={action.key}
                size="sm"
                variant="ghost"
                className={
                  action.variant === "destructive"
                    ? "text-red-300 hover:text-red-200 hover:bg-red-500/20"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }
                onClick={() => handleBulkAction(action.key)}
              >
                {action.icon && <span className="mr-1.5">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={toggleAll}
                    className="rounded-full border-orange-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary"
                  />
                </TableHead>
              )}
              {columns.map((c) => (
                <TableHead key={c.key} className="text-muted-foreground font-medium">{c.header}</TableHead>
              ))}
              {!hasActions && <TableHead className="w-12">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + (hasActions ? 0 : 1)}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : rows.map((row, i) => {
              const isSelected = selectedIds.has(row.id);
              return (
                <TableRow
                  key={row.id || i}
                  className={isSelected ? "bg-orange-50/60 hover:bg-orange-50" : "hover:bg-muted/50"}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(row.id)}
                        className="rounded-full border-orange-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.key}>
                      {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
                    </TableCell>
                  ))}
                  {!hasActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data.length} total)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            <Button variant="default" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
