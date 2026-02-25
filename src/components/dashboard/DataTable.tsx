import { ReactNode, useState } from "react";
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
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

interface DataTableProps {
  columns: Column[];
  data: any[];
  selectable?: boolean;
  pageSize?: number;
}

export function DataTable({ columns, data, selectable = true, pageSize = 10 }: DataTableProps) {
  const [page, setPage] = useState(1);
  const hasActions = columns.some((c) => c.key === "actions");
  const totalPages = Math.ceil(data.length / pageSize);
  const rows = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              {selectable && <TableHead className="w-12"><Checkbox /></TableHead>}
              {columns.map((c) => <TableHead key={c.key} className="text-muted-foreground font-medium">{c.header}</TableHead>)}
              {!hasActions && <TableHead className="w-12">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + (selectable ? 1 : 0) + (hasActions ? 0 : 1)} className="h-24 text-center text-muted-foreground">No results found.</TableCell></TableRow>
            ) : rows.map((row, i) => (
              <TableRow key={row.id || i} className="hover:bg-muted/50">
                {selectable && <TableCell><Checkbox /></TableCell>}
                {columns.map((c) => (
                  <TableCell key={c.key}>{c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}</TableCell>
                ))}
                {!hasActions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View</DropdownMenuItem><DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator /><DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({data.length} total)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
            <Button variant="default" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next<ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
