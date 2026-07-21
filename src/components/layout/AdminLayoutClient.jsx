"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { Sun, Moon } from "lucide-react";

export default function AdminLayoutClient({ user, adminUser, children }) {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("cacapo_admin_theme") || "dark";
    setTheme(savedTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("cacapo_admin_theme", newTheme);
  };

  return (
    <div className={`admin-root ${theme === "light" ? "admin-light" : "admin-dark"} h-screen bg-black text-white font-sans flex flex-col md:flex-row overflow-hidden antialiased transition-colors duration-200`}>
      {/* Admin Sidebar */}
      <AdminSidebar role={adminUser?.role} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden admin-content-area">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/20 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              System Active
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Visual Light / Dark Switcher Pill */}
            {mounted && (
              <div 
                onClick={toggleTheme}
                className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-full cursor-pointer select-none transition-all hover:border-zinc-700 admin-theme-switcher"
                title="Toggle Admin Theme (Dark / Light)"
              >
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase transition-all ${
                  theme === "dark" ? "bg-accent text-white shadow" : "text-zinc-500 hover:text-zinc-300"
                }`}>
                  <Moon className="w-3 h-3 shrink-0" />
                  <span>Dark</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-widest uppercase transition-all ${
                  theme === "light" ? "bg-accent text-white shadow" : "text-zinc-500 hover:text-zinc-300"
                }`}>
                  <Sun className="w-3 h-3 shrink-0" />
                  <span>Light</span>
                </div>
              </div>
            )}

            <div className="text-[10px] font-bold tracking-wider text-zinc-400 truncate max-w-35 sm:max-w-none">
              Authenticated: <span className="text-white font-semibold admin-user-email">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 md:p-12 overflow-y-auto admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
