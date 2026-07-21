export function getOrderStatusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "pending":
    case "pending_payment":
      return "bg-amber-500/15 border border-amber-500/30 text-amber-400";
    case "processing":
      return "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400";
    case "shipped":
      return "bg-indigo-500/15 border border-indigo-500/30 text-indigo-400";
    case "delivered":
      return "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400";
    case "cancelled":
      return "bg-red-500/15 border border-red-500/30 text-red-400";
    case "return_requested":
    case "under_review":
      return "bg-orange-500/15 border border-orange-500/30 text-orange-400";
    case "returned":
      return "bg-rose-500/15 border border-rose-500/30 text-rose-400";
    case "exchange_requested":
    case "exchanged":
      return "bg-purple-500/15 border border-purple-500/30 text-purple-400";
    default:
      return "bg-zinc-800 border border-zinc-700 text-zinc-300";
  }
}

export function getPaymentStatusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "paid":
    case "approved":
      return "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400";
    case "unpaid":
    case "pending":
      return "bg-amber-500/15 border border-amber-500/30 text-amber-500";
    case "failed":
    case "cancelled":
      return "bg-red-500/15 border border-red-500/30 text-red-400";
    case "refunded":
      return "bg-rose-500/15 border border-rose-500/30 text-rose-400";
    default:
      return "bg-zinc-800 border border-zinc-700 text-zinc-300";
  }
}
