"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import AdminPagination from "@/components/ui/AdminPagination";
import { 
  Search, 
  Filter, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  Calendar, 
  Shield, 
  ChevronRight, 
  X, 
  Loader2, 
  ExternalLink,
  Users,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function AdminUsersDesk() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default"); // 'default', 'most_spent', 'most_orders'
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const sortByLabels = {
    default: "Sort: Default",
    most_spent: "Sort: Most Spent (LTV)",
    most_orders: "Sort: Most Orders"
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, sortBy]);

  // Selected User Drawer Details
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    checkRoleAndFetch();
  }, []);

  const checkRoleAndFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      const { data: adminData, error: adminErr } = await supabase
        .from("admin_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (adminErr || !adminData || adminData.role !== "super_admin") {
        setCurrentUserRole(adminData?.role || "unauthorized");
        setLoading(false);
        return;
      }

      setCurrentUserRole("super_admin");
      await fetchUsers();
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during role validation.");
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to load user directory API");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load user database. Please verify client RLS policies.");
      
      // Sandbox data fallback for testing/demo
      const fallbackUsers = [
        { id: "u-1", full_name: "Muhammed Ashique", phone: "+91 9876543210", email: "ashique@cacapo.com", role: "super_admin", created_at: new Date(Date.now() - 30 * 86400000).toISOString(), orderCount: 5, ltv: 1250000 },
        { id: "u-2", full_name: "Jane Doe", phone: "+91 9988776655", email: null, role: "customer", created_at: new Date(Date.now() - 15 * 86400000).toISOString(), orderCount: 2, ltv: 340000 },
        { id: "u-3", full_name: "John Smith", phone: "+91 9444332211", email: null, role: "customer", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
        { id: "u-4", full_name: "Sarah Parker", phone: "+91 9555667788", email: "sarah@cacapo.com", role: "admin", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      ];
      setUsers(fallbackUsers);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  };

  const handleUpdateRole = async (userId, newRole, userEmail) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole, email: userEmail })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update role");
      }

      showToast("User role updated successfully");
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => ({ ...prev, role: newRole }));
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to update user role", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setDeleteConfirmOpen(true);
  };

  const executeDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleteConfirmOpen(false);
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user account");
      }

      showToast("User account permanently deleted");
      
      setSelectedUser(null);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to delete user account", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setDetailsLoading(true);
    setUserAddresses([]);
    setUserOrders([]);
    
    try {
      // Fetch addresses for user
      const { data: addresses } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      setUserAddresses(addresses || []);

      // Fetch orders for user
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            product:products (id, name, slug)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setUserOrders(orders || []);
    } catch (err) {
      console.warn("Could not load selected user details from tables:", err);
      // Fallback details if in sandbox / local test mode
      if (user.id === "u-2") {
        setUserAddresses([
          { id: "addr-1", full_name: "Jane Doe", phone: "+91 9988776655", address_line1: "404 Runway Avenue", city: "Mumbai", state: "Maharashtra", pincode: "400001", country: "India", is_default: true }
        ]);
        setUserOrders([
          { id: "ord-1", order_number: "CCP-88219", total_amount: 1450000, order_status: "pending", created_at: new Date().toISOString(), order_items: [{ product: { name: "Silk Slip Archive Dress" }, quantity: 1, price: 1450000 }] }
        ]);
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const matchesSearch = 
          (u.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.phone || "").includes(searchTerm) ||
          (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (u.id || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = 
          roleFilter === "all" ||
          (roleFilter === "admin" && (u.role === "admin" || u.role === "super_admin")) ||
          (roleFilter === "customer" && u.role === "customer");

        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === "most_spent") {
          return (b.ltv || 0) - (a.ltv || 0); // Descending LTV
        }
        if (sortBy === "most_orders") {
          return (b.orderCount || 0) - (a.orderCount || 0); // Descending order count
        }
        // Default sort: newest user first
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [users, searchTerm, roleFilter, sortBy]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatPrice = (cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "super_admin":
        return (
          <span className="text-[8px] font-extrabold tracking-widest px-2.5 py-0.5 bg-red-950/40 border border-red-500/30 text-red-400 font-mono uppercase">
            Super Admin
          </span>
        );
      case "admin":
        return (
          <span className="text-[8px] font-extrabold tracking-widest px-2.5 py-0.5 bg-amber-950/40 border border-amber-500/30 text-amber-400 font-mono uppercase">
            Admin
          </span>
        );
      default:
        return (
          <span className="text-[8px] font-extrabold tracking-widest px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono uppercase">
            Customer
          </span>
        );
    }
  };

  const getOrderStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "pending_payment":
        return "bg-amber-500/10 border border-amber-500/20 text-amber-500";
      case "processing":
        return "bg-blue-500/10 border border-blue-500/20 text-blue-450";
      case "shipped":
        return "bg-purple-500/10 border border-purple-500/20 text-purple-400";
      case "delivered":
        return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
      case "cancelled":
        return "bg-zinc-850 border border-zinc-800 text-zinc-400";
      case "return_requested":
      case "exchange_requested":
        return "bg-red-500/10 border border-red-500/20 text-red-400";
      case "returned":
      case "exchanged":
        return "bg-pink-500/10 border border-pink-500/20 text-pink-400";
      default:
        return "bg-zinc-500/10 border border-zinc-500/20 text-zinc-405";
    }
  };

  // Metrics
  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role !== "customer").length;
  const totalCustomers = users.filter((u) => u.role === "customer").length;

  return (
    currentUserRole && currentUserRole !== "super_admin" ? (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 select-none font-sans px-4">
        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-none text-red-500 animate-pulse">
          <Shield className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white">
            Access Restricted
          </h1>
          <p className="text-zinc-500 text-xs tracking-wider max-w-md mx-auto leading-relaxed">
            The Users & Roles Desk is reserved for system owners. You require <strong className="text-red-400 font-mono">super_admin</strong> authorization to access these records.
          </p>
        </div>
        <button
          onClick={() => window.location.href = "/admin/orders"}
          className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all duration-300"
        >
          Return to Orders Desk
        </button>
      </div>
    ) : (
      <div className="space-y-10 pb-12 font-sans select-none animate-fadeIn duration-500 relative min-h-screen">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-zinc-900 pb-6">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-accent">
            Workspace Operations
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white mt-1.5">
            Users & Roles Desk
          </h1>
          <p className="text-xs text-zinc-500 tracking-wide mt-1">
            Browse registered clients, audit administrative permissions, and inspect order histories.
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-2">
          <span className="text-[10px] text-zinc-500 font-extrabold tracking-widest uppercase block">Total Accounts</span>
          <h2 className="text-2xl font-black text-white tracking-wide">{totalUsers}</h2>
          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider block">Registered database profiles</span>
        </div>
        <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-2">
          <span className="text-[10px] text-zinc-500 font-extrabold tracking-widest uppercase block">Administrators</span>
          <h2 className="text-2xl font-black text-accent tracking-wide">{totalAdmins}</h2>
          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider block">Active console roles</span>
        </div>
        <div className="border border-zinc-900 bg-zinc-950/20 p-6 space-y-2">
          <span className="text-[10px] text-zinc-500 font-extrabold tracking-widest uppercase block">Customers</span>
          <h2 className="text-2xl font-black text-white tracking-wide">{totalCustomers}</h2>
          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider block">Standard customer logins</span>
        </div>
      </div>

      {/* Controls: Search and Role Filter Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-zinc-900 pb-6">
        <div className="flex flex-col md:flex-row flex-1 max-w-2xl gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-zinc-950/50 border border-zinc-900 text-zinc-100 placeholder-zinc-650 text-xs tracking-wider outline-none focus:border-accent hover:border-zinc-800 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative min-w-[200px] z-20">
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="w-full flex items-center justify-between gap-4 px-4 py-3 bg-zinc-950/50 border border-zinc-900 text-zinc-300 hover:text-white text-[9px] font-bold tracking-widest uppercase transition-all hover:border-zinc-800 rounded-none cursor-pointer"
            >
              <span>{sortByLabels[sortBy]}</span>
              <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            </button>

            {sortDropdownOpen && (
              <>
                {/* Backdrop overlay to close when clicking outside */}
                <div 
                  className="fixed inset-0 z-30 cursor-default" 
                  onClick={() => setSortDropdownOpen(false)}
                />
                
                {/* Dropdown Options Box */}
                <div className="absolute left-0 mt-1.5 w-full bg-zinc-950 border border-zinc-900 shadow-2xl z-40 divide-y divide-zinc-900 animate-fadeIn rounded-none">
                  {Object.keys(sortByLabels).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSortBy(key);
                        setCurrentPage(1);
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3.5 text-[9px] font-bold tracking-widest uppercase transition-all block cursor-pointer ${
                        sortBy === key
                          ? "text-accent bg-accent/5 font-extrabold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-900/40"
                      }`}
                    >
                      {sortByLabels[key]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Role Tabs */}
        <div className="flex items-center border border-zinc-900 p-1 bg-zinc-950/20 text-[10px] font-bold tracking-widest uppercase">
          {[
            { id: "all", label: "All Users" },
            { id: "admin", label: "Admins" },
            { id: "customer", label: "Customers" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-4 py-2 border transition-all cursor-pointer ${
                roleFilter === tab.id
                  ? "bg-accent/10 border-accent/20 text-accent"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Database Grid */}
      <div className="border border-zinc-900 bg-zinc-950/10 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs tracking-widest uppercase">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span>Scanning User Database...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-zinc-500 text-xs tracking-widest uppercase">
            No matching users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest bg-zinc-950/30">
                  <th className="p-5">Name & Profile ID</th>
                  <th className="p-5">Contact Details</th>
                  <th className="p-5">Role Permission</th>
                  <th className="p-5">Orders & LTV</th>
                  <th className="p-5">Registration Date</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 tracking-wider">
                {paginatedUsers.map((user) => {
                  const regDate = new Date(user.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <tr
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`hover:bg-zinc-950/40 transition-colors cursor-pointer group ${
                        selectedUser?.id === user.id ? "bg-zinc-950/60" : ""
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="p-5">
                        <div className="font-bold text-white group-hover:text-accent transition-colors flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>{user.full_name}</span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-600 block mt-1">
                          {user.id}
                        </span>
                      </td>

                      {/* Contact details */}
                      <td className="p-5 space-y-1">
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Phone className="w-3 h-3 text-zinc-600" />
                          <span>{user.phone}</span>
                        </div>
                        {user.email && (
                          <div className="flex items-center gap-2 text-zinc-500 font-medium">
                            <Mail className="w-3 h-3 text-zinc-700" />
                            <span>{user.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td className="p-5">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* Orders & LTV */}
                      <td className="p-5 space-y-1">
                        <div className="flex items-center gap-2 text-zinc-300 font-bold">
                          <ShoppingBag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>{user.orderCount || 0} Orders</span>
                        </div>
                        <span className="text-[10.5px] font-extrabold text-accent block font-mono">
                          {formatPrice(user.ltv || 0)} LTV
                        </span>
                      </td>

                      {/* Registration timestamp */}
                      <td className="p-5 text-zinc-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          <span>{regDate}</span>
                        </div>
                      </td>

                      {/* Detail CTA link */}
                      <td className="p-5 text-right">
                        <button className="p-2 text-zinc-500 hover:text-white transition-colors group-hover:translate-x-1 duration-300">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="mt-8">
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300">
          <div className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-900 h-screen fixed top-0 right-0 flex flex-col justify-between p-8 space-y-8 animate-slideIn z-50">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-zinc-900 pb-5 shrink-0">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-accent flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Profile Audit
                </span>
                <h3 className="text-lg font-extrabold tracking-widest text-white uppercase">
                  {selectedUser.full_name}
                </h3>
                <span className="text-[9px] font-mono text-zinc-500 block">ID: {selectedUser.id}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all bg-zinc-900/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-8">
              
              {/* Account Profile Meta details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 border border-zinc-900 bg-zinc-950/50">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold tracking-widest text-zinc-500 uppercase block">Registered Phone</span>
                  <span className="text-zinc-200 font-semibold text-xs">{selectedUser.phone}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold tracking-widest text-zinc-500 uppercase block">Auth Email Address</span>
                  <span className="text-zinc-200 font-semibold text-xs">{selectedUser.email || "N/A"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold tracking-widest text-zinc-500 uppercase block">System Permission Role</span>
                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold tracking-widest text-zinc-500 uppercase block">Database Created At</span>
                  <span className="text-zinc-200 font-semibold text-xs">
                    {new Date(selectedUser.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold tracking-widest text-zinc-500 uppercase block">Total Orders Count</span>
                  <span className="text-zinc-200 font-extrabold text-xs">{selectedUser.orderCount || 0} Orders</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold tracking-widest text-zinc-500 uppercase block">Lifetime Value (LTV)</span>
                  <span className="text-accent font-extrabold text-xs">{formatPrice(selectedUser.ltv || 0)}</span>
                </div>
              </div>

              {detailsLoading ? (
                <div className="p-8 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs tracking-wider uppercase">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <span>Retrieving Profile Details...</span>
                </div>
              ) : (
                <>
                  {/* User Addresses */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-accent" /> Saved Address Book ({userAddresses.length})
                    </h4>
                    
                    {userAddresses.length === 0 ? (
                      <div className="p-5 border border-zinc-900 bg-zinc-950/20 text-center text-zinc-500 text-[10px] uppercase tracking-widest">
                        No addresses saved in profile yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userAddresses.map((addr) => (
                          <div key={addr.id} className="p-4 border border-zinc-900 bg-zinc-950/20 space-y-2 relative">
                            {addr.is_default && (
                              <span className="absolute top-3 right-3 text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-green-950/30 border border-green-500/20 text-green-400 font-mono">
                                Default
                              </span>
                            )}
                            <div className="font-bold text-white text-[11px] uppercase tracking-wider">{addr.full_name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{addr.phone}</div>
                            <p className="text-[10px] text-zinc-400 tracking-wide leading-relaxed">
                              {addr.address_line1}
                              {addr.address_line2 && <>, {addr.address_line2}</>}
                              <br />
                              {addr.city}, {addr.state} - {addr.pincode}
                              <br />
                              {addr.country}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Orders */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-accent" /> Checkout Orders History ({userOrders.length})
                    </h4>

                    {userOrders.length === 0 ? (
                      <div className="p-5 border border-zinc-900 bg-zinc-950/20 text-center text-zinc-500 text-[10px] uppercase tracking-widest">
                        No orders recorded for this account.
                      </div>
                    ) : (
                      <div className="border border-zinc-900 bg-zinc-950/10 divide-y divide-zinc-900">
                        {userOrders.map((order) => {
                          const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          });

                          return (
                            <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-white text-xs">{order.order_number}</span>
                                  <span className={`text-[7px] font-extrabold tracking-widest px-1.5 py-0.5 rounded-none font-mono uppercase ${getOrderStatusBadgeStyle(order.order_status)}`}>
                                    {order.order_status?.replace("_", " ") || "PENDING"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  Date: <span className="text-zinc-400 font-semibold">{orderDate}</span> • Method: <span className="text-zinc-400 uppercase font-semibold">{order.payment_method}</span>
                                </div>
                                
                                {/* Order items display */}
                                <div className="text-[10px] text-zinc-500 pt-1 font-medium">
                                  Items:{" "}
                                  <span className="text-zinc-400">
                                    {order.order_items?.map((item) => `${item.product?.name} (x${item.quantity})`).join(", ")}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-white font-extrabold text-xs">{formatPrice(order.total_amount)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Administrative Controls */}
                  <div className="border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                    <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-accent" /> Administrative Controls
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1">
                            System Role Permission
                          </label>
                          <p className="text-[11px] text-zinc-400">
                            Assign permissions. Regular users are Customers.
                          </p>
                        </div>
                        <div className="relative shrink-0">
                          <select
                            disabled={actionLoading}
                            value={selectedUser.role || "customer"}
                            onChange={(e) => handleUpdateRole(selectedUser.id, e.target.value, selectedUser.email)}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs px-4 py-2 uppercase tracking-wider font-semibold rounded-none focus:outline-none focus:border-accent hover:border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <option value="customer">Customer</option>
                            <option value="admin">Admin (Staff)</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="border-t border-zinc-900 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="text-[10px] text-red-500/80 uppercase tracking-widest font-bold block mb-1">
                            Danger Zone
                          </label>
                          <p className="text-[11px] text-zinc-400">
                            Permanently delete this user credentials and database profile.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleDeleteUser(selectedUser.id)}
                          className="px-4 py-2 border border-red-500/30 text-red-400 hover:border-red-500 text-[10px] font-bold tracking-widest uppercase transition-all rounded-none bg-red-950/5 hover:bg-red-950/15 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>

                </>
              )}

            </div>

            {/* Footer buttons */}
            <div className="border-t border-zinc-900 pt-5 shrink-0 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold tracking-widest uppercase transition-colors rounded-none"
              >
                Close Audit View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Keyframes injected for drawer animations */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

      {/* Custom Luxury Confirm Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-9999 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-900 p-6 max-w-sm w-full space-y-6 rounded-none shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-red-500 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" /> Confirm Deletion
              </h3>
              <p className="text-[10px] text-zinc-400 leading-relaxed tracking-wider">
                Are you sure you want to permanently delete **{selectedUser?.full_name || "this user"}**? This action is irreversible and will purge their authentication credentials and profile database records.
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="w-1/2 py-2 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white text-[9px] font-bold tracking-widest uppercase transition-all rounded-none cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteUser}
                className="w-1/2 py-2 bg-red-600 text-white text-[9px] font-bold tracking-widest uppercase hover:bg-red-700 transition-all rounded-none cursor-pointer border-none"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Luxury Toast Notifications */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-9999 flex items-center gap-3 px-5 py-4 bg-zinc-950/90 backdrop-blur-md border animate-slideInRight duration-300 rounded-none shadow-2xl ${
          toast.type === "success" 
            ? "border-green-500/30 text-green-400" 
            : "border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-[10px] font-bold tracking-widest uppercase font-mono">{toast.message}</span>
          <button 
            type="button"
            onClick={() => setToast(null)} 
            className="ml-3 text-zinc-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
    )
  );
}
