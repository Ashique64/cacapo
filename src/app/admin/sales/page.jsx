"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminPagination from "@/components/ui/AdminPagination";
import { 
  Search, 
  TrendingUp, 
  Calendar, 
  Users, 
  Filter, 
  DollarSign, 
  FileText,
  Loader2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Percent
} from "lucide-react";

export default function SalesReportDesk() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("paid"); // default to paid to show real revenue

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, monthFilter, statusFilter]);

  // Calculation Toggles
  const [deductCoupons, setDeductCoupons] = useState(true);
  const [deductGst, setDeductGst] = useState(false);

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          created_at,
          total_amount,
          subtotal,
          shipping_charge,
          discount,
          payment_status,
          order_status,
          shipping_address
        `)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to load sales data:", err);
      setError(err.message || "Could not retrieve sales records.");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique months for the filter
  const availableMonths = [...new Set(orders.map(order => {
    const d = new Date(order.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))].sort().reverse();

  // Filter Data
  const filteredOrders = orders.filter(order => {
    const customerName = order.shipping_address?.full_name?.toLowerCase() || "";
    const customerEmail = order.shipping_address?.email?.toLowerCase() || "";
    const matchesSearch = 
      customerName.includes(searchTerm.toLowerCase()) || 
      customerEmail.includes(searchTerm.toLowerCase()) || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesMonth = true;
    if (monthFilter !== "all") {
      const d = new Date(order.created_at);
      const orderMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      matchesMonth = orderMonth === monthFilter;
    }

    let matchesStatus = true;
    if (statusFilter !== "all") {
      matchesStatus = order.payment_status === statusFilter;
    }

    return matchesSearch && matchesMonth && matchesStatus;
  });

  // Calculate Revenue
  const metrics = filteredOrders.reduce((acc, order) => {
    acc.ordersCount += 1;

    // Base revenue is the final amount paid by the customer
    let orderRevenue = order.total_amount || 0;

    // If they want Gross Revenue (i.e., NOT deducting coupons), we add the discount back
    if (!deductCoupons) {
      orderRevenue += (order.discount || 0);
    }

    // Deduct GST (18%) if toggled
    if (deductGst) {
      orderRevenue = orderRevenue / 1.18;
    }

    acc.totalRevenue += Math.max(0, orderRevenue);
    return acc;
  }, { totalRevenue: 0, ordersCount: 0 });

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatPrice = (cents) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format((cents || 0) / 100);
  };

  const formatMonthLabel = (yyyyMm) => {
    if (yyyyMm === "all") return "All Time";
    const [year, month] = yyyyMm.split("-");
    const d = new Date(year, parseInt(month) - 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-8 select-none font-sans text-white animate-fadeIn duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-zinc-900">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            Analytics Hub
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider uppercase text-white mt-1">
            Sales Report
          </h1>
        </div>

        <button 
          onClick={fetchSalesData}
          disabled={loading}
          className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-2 rounded-none cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sync Data
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-6 hover:border-zinc-800 transition-colors">
          <div className="flex items-center gap-3 text-accent mb-4">
            <DollarSign className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total Revenue</h3>
          </div>
          <div className="text-4xl font-extrabold tracking-wider">
            {formatPrice(metrics.totalRevenue)}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-2">
            Based on current filters
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-6 hover:border-zinc-800 transition-colors">
          <div className="flex items-center gap-3 text-accent mb-4">
            <FileText className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total Orders</h3>
          </div>
          <div className="text-4xl font-extrabold tracking-wider">
            {metrics.ordersCount}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-2">
            Matching transactions
          </p>
        </div>
      </div>

      {/* Filters & Toggles */}
      <div className="flex flex-col lg:flex-row gap-6 p-6 border border-zinc-900 bg-zinc-950/50">
        
        {/* Left: Standard Filters */}
        <div className="flex-1 space-y-4">
          <h4 className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2">Search & Filter</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search user, email, order..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-accent text-white px-4 py-2.5 pl-10 text-xs tracking-wider outline-none transition-all rounded-none"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            </div>

            <div className="relative">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-accent text-white px-4 py-2.5 pl-10 text-xs tracking-wider outline-none transition-all rounded-none appearance-none"
              >
                <option value="all">All Time</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-accent text-white px-4 py-2.5 pl-10 text-xs tracking-wider outline-none transition-all rounded-none appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid Only</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            </div>
          </div>
        </div>

        {/* Right: Revenue Logic Toggles */}
        <div className="lg:w-64 space-y-4 lg:border-l border-zinc-900 lg:pl-6">
          <h4 className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 mb-2">Revenue Logic</h4>
          
          <div className="space-y-3">
            <button 
              onClick={() => setDeductCoupons(!deductCoupons)}
              className="w-full flex items-center justify-between text-xs tracking-wider font-semibold uppercase group"
            >
              <span className={`transition-colors ${deductCoupons ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                Deduct Coupons
              </span>
              {deductCoupons ? <ToggleRight className="w-5 h-5 text-accent" /> : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
            </button>

            <button 
              onClick={() => setDeductGst(!deductGst)}
              className="w-full flex items-center justify-between text-xs tracking-wider font-semibold uppercase group"
            >
              <span className={`transition-colors ${deductGst ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                Deduct 18% GST
              </span>
              {deductGst ? <ToggleRight className="w-5 h-5 text-accent" /> : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
            </button>
          </div>
        </div>

      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 border border-zinc-900 bg-black">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-xs text-zinc-500 tracking-widest uppercase">Fetching sales ledger...</span>
        </div>
      ) : error ? (
        <div className="border border-red-500/20 bg-red-500/5 text-red-500 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto" />
          <p className="text-xs tracking-wider font-semibold uppercase">{error}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="border border-zinc-900 bg-zinc-950/10 p-16 text-center text-zinc-500 text-xs tracking-wider uppercase">
          No transactions found for the selected criteria.
        </div>
      ) : (
        <div className="border border-zinc-900 bg-black overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px] text-xs tracking-wider">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/40 text-zinc-500 font-bold uppercase">
                <th className="p-4 w-32">Date</th>
                <th className="p-4 w-40">Order No.</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Discount</th>
                <th className="p-4 text-right">Final Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {paginatedOrders.map(order => {
                const d = new Date(order.created_at);
                const isPaid = order.payment_status === "paid";
                
                return (
                  <tr key={order.id} className="hover:bg-zinc-950/20 transition-colors">
                    <td className="p-4 font-mono text-zinc-400">
                      {d.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 font-mono font-bold text-white">
                      {order.order_number}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-white block uppercase">{order.shipping_address?.full_name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">{order.shipping_address?.email}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-none font-mono ${
                        isPaid
                          ? "bg-green-500/10 border border-green-500/20 text-green-500" 
                          : "bg-red-500/10 border border-red-500/20 text-red-400"
                      }`}>
                        {order.payment_status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-zinc-400">
                      {order.discount > 0 ? `-${formatPrice(order.discount)}` : "-"}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-white text-[13px]">
                      {formatPrice(order.total_amount)}
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
  );
}
