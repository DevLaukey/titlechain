"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  PlusSquare,
  ArrowLeftRight,
  Shield,
  FileText,
  ClipboardCheck,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/properties",
    label: "Properties",
    icon: Building2,
  },
  {
    href: "/properties/new",
    label: "Register Property",
    icon: PlusSquare,
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
  },
  {
    href: "/registrar",
    label: "Registrar Queue",
    icon: ClipboardCheck,
  },
  {
    href: "/escrow",
    label: "Escrow",
    icon: Shield,
  },
  {
    href: "/documents",
    label: "Documents",
    icon: FileText,
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: ScrollText,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({
  children,
  title,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#080808] border-r border-white/8 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/8">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-gold text-2xl font-bold">◈</span>
            <span className="text-white font-bold text-base tracking-widest uppercase">
              TITLECHAIN
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "text-gold bg-gold/10 border-l-2 border-gold pl-[10px]"
                    : "text-white/40 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? "text-gold" : "text-white/30"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* KYC Status */}
          <div className="pt-4 mt-4 border-t border-white/8">
            <div className="px-3 py-2.5 rounded-lg bg-[#111111] border border-white/8">
              <p className="text-white/30 text-xs font-medium mb-1.5 tracking-wide uppercase">
                KYC Status
              </p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  user?.kycStatus === "VERIFIED"
                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                    : user?.kycStatus === "REJECTED"
                    ? "bg-red-400/10 text-red-400 border border-red-400/20"
                    : "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                }`}
              >
                {user?.kycStatus ?? "PENDING"}
              </span>
            </div>
          </div>
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-white/8">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gold/20 border border-gold/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-semibold text-sm">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.firstName
                  ? `${user.firstName} ${user.lastName ?? ""}`
                  : user?.email}
              </p>
              <p className="text-white/30 text-xs truncate">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/20 hover:text-gold transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-[#080808] border-b border-white/8 flex items-center px-6 flex-shrink-0">
          <h1 className="text-base font-semibold text-white tracking-wide">
            {title ?? "Dashboard"}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-black">{children}</main>
      </div>
    </div>
  );
}
