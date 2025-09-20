import { BookOpen, Library, NotebookPen, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  {
    title: "My Library",
    url: "/",
    icon: Library,
  },
  {
    title: "Currently Reading",
    url: "/reading",
    icon: BookOpen,
  },
  {
    title: "Reading Stats",
    url: "/stats", 
    icon: TrendingUp,
  },
  {
    title: "Notes",
    url: "/notes",
    icon: NotebookPen,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    // Auto-minimize sidebar on mobile/small screens
    setOpenMobile(false);
    console.log("Navigation clicked, sidebar minimized");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>BookTracker</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={location === item.url}>
                    <Link 
                      href={item.url} 
                      onClick={handleNavClick}
                      data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}