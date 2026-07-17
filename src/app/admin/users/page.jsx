"use client";

import { useEffect, useState } from "react";
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
  Users
} from "lucide-react";

export default function AdminUsersDesk() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

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

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = 
      roleFilter === "all" ||
      (roleFilter === "admin" && (u.role === "admin" || u.role === "super_admin")) ||
      (roleFilter === "customer" && u.role === "customer");

    return matchesSearch && matchesRole;
  });

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or profile ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-950/50 border border-zinc-900 text-zinc-100 placeholder-zinc-600 text-xs tracking-wider outline-none focus:border-accent hover:border-zinc-800 transition-colors"
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

      {/* Sliding Details Drawer overlay */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300">
          <div className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-900 h-full overflow-y-auto flex flex-col justify-between p-8 space-y-8 animate-slideIn">
            
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
            <div className="flex-1 space-y-8">
              
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
                                  <span className={`text-[7px] font-extrabold tracking-widest px-1.5 py-0.5 rounded-none font-mono ${
                                    order.order_status === "pending" || order.order_status === "pending_payment"
                                      ? "bg-accent/10 border border-accent/20 text-accent"
                                      : "bg-green-500/10 border border-green-500/20 text-green-500"
                                  }`}>
                                    {order.order_status?.toUpperCase() || "PENDING"}
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

    </div>
    )
  );
}
