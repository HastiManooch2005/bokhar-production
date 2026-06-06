import { useState, useEffect } from "react";
import { 
  fetchCoupons, 
  deleteCoupon 
} from "../../../../api/discountsApi";
import { fetchCustomers } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import CouponModal from "../modals/CouponModal"; 
import { 
  Plus, 
  X, 
  Pencil, 
  Trash2,
  Clock, 
  AlertCircle,
  Percent,
  Banknote,
  Tag,
  AlertTriangle,
  Copy,
  CheckCircle2,
  XCircle,
  Users,
  User,
  TicketPercent,
  Search as SearchIcon,
  RefreshCw
} from 'lucide-react';
import Search from "../../../Search";

export default function CouponTab() {
  const [items, setItems] = useState([]); // coupons
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    item: null
  });

  const { addToast } = useToast();

  // Load data
  const loadCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetchCoupons();
      console.log("Fetched coupons:", res);
      setItems(res);
    } catch (err) {
      console.error("Error loading coupons:", err);
      addToast("خطا در دریافت لیست کدها", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetchCustomers();
      console.log("Fetched customers:", res);
      setCustomers(res);
    } catch (err) {
      console.error("Error loading customers:", err);
      addToast("خطا در دریافت لیست مشتریان", "error");
    }
  };

  useEffect(() => {
    loadCoupons();
    loadCustomers();
  }, []);

  const getCouponUserId = (coupon) => {
    if (!coupon) return null;
    if (coupon.user && typeof coupon.user === 'object' && coupon.user.id) {
      return String(coupon.user.id);
    }
    if (coupon.user && (typeof coupon.user === 'number' || typeof coupon.user === 'string')) {
      return String(coupon.user);
    }
    if (coupon.user_id !== undefined && coupon.user_id !== null) {
      return String(coupon.user_id);
    }
    return null;
  };

  const getCustomerActiveCoupon = (customerId) => {
    const strCustomerId = String(customerId);
    const now = new Date();
    
    const activeCoupon = items.find(coupon => {
      const couponUserId = getCouponUserId(coupon);
      
      if (couponUserId !== strCustomerId) return false;
      if (!coupon.is_active) return false;
      if (coupon.ends_at && new Date(coupon.ends_at) < now) return false;
      if (coupon.starts_at && new Date(coupon.starts_at) > now) return false;
      return true;
    });
    
    return activeCoupon;
  };

  const hasActiveCoupon = (customerId) => {
    return !!getCustomerActiveCoupon(customerId);
  };

  const handleAdd = () => {
    setSelectedCustomer(null);
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleAddForCustomer = (customer) => {
    console.log("Creating coupon for customer:", customer);
    setSelectedCustomer(customer);
    setEditingItem(null);
    setIsModalOpen(true);
  };

const handleEdit = (item) => {
  setEditingItem(item);
  
  // پیدا کردن مشتری از لیست customers با استفاده از user_id
  const userId = getCouponUserId(item);
  if (userId) {
    const customerObj = customers.find(c => String(c.id) === userId);
    setSelectedCustomer(customerObj || null);
  } else {
    setSelectedCustomer(null);
  }
  
  setIsModalOpen(true);
};


  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setSelectedCustomer(null);
  };

  const handleSaved = () => {
    setTimeout(() => {
      loadCoupons();
    }, 300);
    handleCloseModal();
  };

  const openDeleteConfirm = (item) => {
    setDeleteConfirm({ isOpen: true, item });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, item: null });
    setDeletingId(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.item) return;
    
    const id = deleteConfirm.item.id;
    setDeletingId(id);
    
    try {
      await deleteCoupon(id);
      addToast("کد تخفیف با موفقیت حذف شد", "success");
      await loadCoupons();
      closeDeleteConfirm();
    } catch (err) {
      console.error("Error deleting coupon:", err);
      addToast("خطا در حذف کد تخفیف", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    addToast("کد در کلیپ‌بورد کپی شد", "success");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "نامحدود";
    return new Date(dateStr).toLocaleDateString('fa-IR');
  };

  const filteredCustomers = customers.filter(c => 
    c.fullname?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.phone?.includes(customerSearchTerm)
  );

  const activeCoupons = items.filter(c => c.is_active).length;
  const exclusiveCoupons = items.filter(c => c.user || c.user_id).length;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8 px-3 md:px-4 overflow-x-hidden">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-3 sm:p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">کل مشتریان</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 dark:text-white mt-1">{customers.length}</p>
            </div>
            <div className="p-1.5 sm:p-2 lg:p-3 bg-purple-100 dark:bg-purple-500/20 rounded-lg lg:rounded-xl text-purple-600 dark:text-purple-300">
              <Users size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </div>
        
        <div className="p-3 sm:p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">کدهای فعال</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCoupons}</p>
            </div>
            <div className="p-1.5 sm:p-2 lg:p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg lg:rounded-xl text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">اختصاصی</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">{exclusiveCoupons}</p>
            </div>
            <div className="p-1.5 sm:p-2 lg:p-3 bg-sky-100 dark:bg-sky-500/20 rounded-lg lg:rounded-xl text-sky-600 dark:text-sky-300">
              <User size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button 
          onClick={loadCoupons}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          بروزرسانی لیست
        </button>
      </div>

      {/* Customers Section with Coupon Status */}
      <div className="w-full p-4 md:p-5 rounded-2xl bg-white/70 dark:bg-neutral-800/60 backdrop-blur-md border border-sky-200 dark:border-indigo-600 shadow-lg">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
              مدیریت مشتریان و کدهای تخفیف
            </h3>
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
              {customers.length}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Search
                value={customerSearchTerm}
                onChange={setCustomerSearchTerm}
                placeholder="جستجو در مشتریان..."
              />
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 text-white shadow hover:scale-105 transition text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">کد عمومی</span>
            </button>
          </div>
        </div>

        {/* Customers List */}
        {loading && customers.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-2">
            <Users className="w-10 h-10 opacity-30" />
            <p>مشتری‌ای یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-700/30 bg-white/50 dark:bg-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-white/5 border-b border-gray-200 dark:border-gray-700/50">
                    <th className="py-3 px-2 sm:px-3 lg:px-6 text-right font-semibold text-gray-700 dark:text-gray-300">مشتری</th>
                    <th className="py-3 px-2 sm:px-3 lg:px-6 text-right font-semibold text-gray-700 dark:text-gray-300">تماس</th>
                    <th className="py-3 px-2 sm:px-3 lg:px-6 text-center font-semibold text-gray-700 dark:text-gray-300">وضعیت</th>
                    <th className="py-3 px-2 sm:px-3 lg:px-6 text-right font-semibold text-gray-700 dark:text-gray-300">کد فعال</th>
                    <th className="py-3 px-2 sm:px-3 lg:px-6 text-center font-semibold text-gray-700 dark:text-gray-300">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {filteredCustomers.map((customer) => {
                    const activeCoupon = getCustomerActiveCoupon(customer.id);
                    const hasCoupon = !!activeCoupon;
                    
                    return (
                      <tr 
                        key={customer.id} 
                        className="group hover:bg-purple-50/50 dark:hover:bg-purple-500/5 transition-colors duration-200"
                      >
                        <td className="py-3 px-2 sm:px-3 lg:px-6">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{customer.fullname}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:block">ID: {customer.id}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-3 px-2 sm:px-3 lg:px-6 text-gray-600 dark:text-gray-300 font-mono dir-ltr text-left text-xs sm:text-sm">
                          {customer.phone}
                        </td>
                        
                        {/* وضعیت - در موبایل فقط آیکون، در دسکتاپ آیکون و متن */}
                        <td className="py-3 px-2 sm:px-3 lg:px-6 text-center">
                          {hasCoupon ? (
                            <div 
                              className="inline-flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                              title="فعال"
                            >
                              <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline mr-1 text-xs font-medium">فعال</span>
                            </div>
                          ) : (
                            <div 
                              className="inline-flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400"
                              title="غیر فعال"
                            >
                              <XCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline mr-1 text-xs font-medium">غیرفعال</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-2 sm:px-3 lg:px-6">
                          {hasCoupon ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <code className="px-1.5 sm:px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-[10px] sm:text-xs font-mono text-purple-700 dark:text-purple-400 truncate max-w-[80px] sm:max-w-none">
                                  {activeCoupon.code}
                                </code>
                                <button 
                                  onClick={() => copyToClipboard(activeCoupon.code)}
                                  className="p-1 text-gray-400 hover:text-purple-600 transition"
                                  title="کپی کد"
                                >
                                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                                {activeCoupon.type === 'percent' ? (
                                  <span>% {activeCoupon.value}</span>
                                ) : (
                                  <span>{Number(activeCoupon.value).toLocaleString()} تومان</span>
                                )}
                                {activeCoupon.ends_at && (
                                  <span className="mr-2 text-amber-600">
                                    تا {formatDate(activeCoupon.ends_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        {/* عملیات - در موبایل فقط آیکون، در دسکتاپ دکمه کامل */}
                        <td className="py-3 px-2 sm:px-3 lg:px-6 text-center">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            {hasCoupon ? (
                              <button
                                onClick={() => handleEdit(activeCoupon)}
                                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition"
                                title="ویرایش کد"
                              >
                                <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline mr-1 text-xs font-medium">ویرایش</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddForCustomer(customer)}
                                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition"
                                title="ساخت کد جدید"
                              >
                                <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline mr-1 text-xs font-medium">ساختن</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* All Coupons List */}
      <div className="w-full p-4 md:p-5 rounded-2xl bg-white/70 dark:bg-neutral-800/60 backdrop-blur-md border border-sky-200 dark:border-indigo-600 shadow-lg opacity-80">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700/50">
          <Tag className="w-4 h-4 text-gray-500" />
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">همه کدهای تخفیف ({items.length})</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.slice(0, 6).map((item) => (
            <div key={item.id} className="p-3 bg-white/50 dark:bg-neutral-700/50 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2 overflow-hidden">
                <code className="text-sm font-mono text-purple-700 dark:text-purple-400 truncate">{item.code}</code>
                {getCouponUserId(item) && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded shrink-0">
                    اختصاصی
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleEdit(item)} className="p-1 text-gray-400 hover:text-sky-600">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openDeleteConfirm(item)} className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {items.length > 6 && (
            <div className="p-3 text-center text-xs text-gray-500">
              و {items.length - 6} مورد دیگر...
            </div>
          )}
        </div>
      </div>

      {/* Coupon Modal */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editItem={editingItem}
        customer={selectedCustomer}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 h-full z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-gray-200 dark:border-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">تأیید حذف</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">این عملیات قابل بازگشت نیست</p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-gray-50 dark:bg-neutral-700/50 p-3 rounded-lg">
              آیا از حذف کد تخفیف 
              <span className="font-bold mx-1 text-gray-800 dark:text-gray-200 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded font-mono">
                {deleteConfirm.item?.code}
              </span>
              اطمینان دارید؟
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={closeDeleteConfirm}
                disabled={deletingId === deleteConfirm.item?.id}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600 transition text-sm font-medium"
              >
                انصراف
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId === deleteConfirm.item?.id}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {deletingId === deleteConfirm.item?.id ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    در حال حذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    بله، حذف شود
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
