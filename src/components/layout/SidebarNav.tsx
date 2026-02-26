import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid, Database, Ticket, Users, Briefcase, Bell, Image, Handshake, Shield, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logoOrange from "@/assets/raffle-fox-logo-orange.png";

interface SidebarNavProps { collapsed: boolean; onToggle: () => void; }

const menuItems = [
  { title: "Dashboard", icon: LayoutGrid, route: "/dashboard" },
  { title: "Prize Database", icon: Database, route: "/prizes" },
  { title: "Game Database", icon: Ticket, route: "/games" },
  { title: "Gamers Management", icon: Users, route: "/gamers" },
  { title: "Game Images", icon: Image, route: "/game-images", superAdminOnly: true },
  { title: "Sponsor Library", icon: Briefcase, route: "/sponsors" },
  { title: "Notifications", icon: Bell, route: "/notifications" },
  { title: "Partner Management", icon: Handshake, route: "/partners" },
  { title: "Admin Management", icon: Shield, route: "/admins" },
];

export function SidebarNav({ collapsed, onToggle }: SidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, adminProfile } = useAuth();
  const isSuperAdmin = adminProfile?.role === "super_admin";

  const handleLogout = async () => { await logout(); navigate("/auth"); };

  return (
    <aside className={cn("h-screen sticky top-0 border-r border-border bg-card flex flex-col transition-all duration-300", collapsed ? "w-16" : "w-[280px]")}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && <img src={logoOrange} alt="Raffle Fox" className="h-8 object-contain" />}
        {collapsed && <img src={logoOrange} alt="Raffle Fox" className="h-8 w-8 object-contain mx-auto" />}
        <Button variant="ghost" size="icon" onClick={onToggle} className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", collapsed && "hidden")}><ChevronLeft className="h-4 w-4" /></Button>
      </div>
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.filter((item) => !(item as any).superAdminOnly || isSuperAdmin).map((item) => {
            const isActive = location.pathname === item.route || (item.route === "/dashboard" && location.pathname === "/");
            return (
              <li key={item.route}>
                <NavLink to={item.route} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors", isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-2 border-t border-border">
        <Button variant="ghost" onClick={handleLogout} className={cn("w-full justify-start text-muted-foreground hover:text-foreground", collapsed && "justify-center px-0")}>
          <LogOut className="h-5 w-5" />{!collapsed && <span className="ml-3">Log Out</span>}
        </Button>
      </div>
      {collapsed && <Button variant="ghost" size="icon" onClick={onToggle} className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-border bg-card shadow-sm"><ChevronRight className="h-3 w-3" /></Button>}
    </aside>
  );
}
