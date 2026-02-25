import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Bell, Menu, Loader2,
  Gamepad2, Trophy, Users, Building2, Shield, Handshake, ImageIcon, Ticket,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { globalSearch, type GlobalSearchResult } from "@/lib/global-search";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface TopBarProps {
  onMenuToggle: () => void;
}

const typeIcons: Record<string, any> = {
  game: Gamepad2,
  prize: Trophy,
  user: Users,
  sponsor: Building2,
  admin: Shield,
  partner: Handshake,
  image: ImageIcon,
  ticket: Ticket,
};

const typeLabels: Record<string, string> = {
  game: "Games",
  prize: "Prizes",
  user: "Gamers",
  sponsor: "Sponsors",
  admin: "Admins",
  partner: "Partners",
  image: "Game Images",
  ticket: "Tickets",
};

export function TopBar({ onMenuToggle }: TopBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await globalSearch(q);
        setResults(r);
        setOpen(r.length > 0 || q.length >= 2);
        setActiveIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    doSearch(e.target.value);
  };

  const selectResult = (r: GlobalSearchResult) => {
    navigate(r.href);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0 && results[activeIdx]) {
      e.preventDefault();
      selectResult(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Group results by type
  const grouped = results.reduce<Record<string, GlobalSearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/auth");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "AD";

  return (
    <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search with dropdown */}
        <div ref={containerRef} className="relative w-[420px] max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin z-10" />}
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search games, prizes, users, sponsors..."
            className="pl-10 pr-10 h-10 bg-secondary border-0"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
          />

          {/* Results Dropdown */}
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
              {results.length === 0 && !loading ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No results found for "{query}"
                </div>
              ) : (
                <ScrollArea className="max-h-[360px]">
                  <div className="py-1">
                    {Object.entries(grouped).map(([type, items]) => {
                      const Icon = typeIcons[type] || Search;
                      return (
                        <div key={type}>
                          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Icon className="h-3 w-3" />
                            {typeLabels[type] || type}
                          </div>
                          {items.map((r) => {
                            const globalIdx = results.indexOf(r);
                            return (
                              <button
                                key={`${r.type}-${r.id}`}
                                onClick={() => selectResult(r)}
                                onMouseEnter={() => setActiveIdx(globalIdx)}
                                className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors ${
                                  globalIdx === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{r.label}</p>
                                  {r.sublabel && (
                                    <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/notifications")}>
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/placeholder.svg" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">{user?.email || "Admin"}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/notifications")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
