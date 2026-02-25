import { MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SponsorCardProps {
  title?: string;
  imageUrl?: string;
  logoUrl?: string;
  sponsor?: {
    id: string;
    name: string;
    logoUrl: string;
    website?: string;
    status: string;
    createdAt: Date;
  };
}

export function SponsorCard({ title, imageUrl, logoUrl, sponsor }: SponsorCardProps) {
  const displayName = title || sponsor?.name || "Sponsor";
  const imgSrc = logoUrl || imageUrl || sponsor?.logoUrl;
  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-square bg-secondary flex items-center justify-center relative group">
      {imgSrc ? (
          <img src={imgSrc} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground">
              {displayName.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-foreground truncate">{displayName}</h3>
      </div>
    </Card>
  );
}
