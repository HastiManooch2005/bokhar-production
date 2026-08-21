import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Trash2,
  BriefcaseBusiness,
  Star,
  Clock,
  MessageSquare,
  Building2,
  Hash,
  Layers,
} from "lucide-react";
import AddressModal from "./AddressModal";

// ---------------- ICON RESOLVER ----------------
const getAddressIcon = (title) => {
  const t = title?.trim() || "";
  if (
    t.includes("کار") ||
    t.includes("دفتر") ||
    t.toLowerCase().includes("work") ||
    t.toLowerCase().includes("office")
  ) {
    return BriefcaseBusiness;
  }
  return MapPin;
};

const getIconBg = (title) => {
  const t = title?.trim() || "";
  if (
    t.includes("کار") ||
    t.includes("دفتر") ||
    t.toLowerCase().includes("work")
  ) {
    return "bg-sky-100 dark:bg-sky-900/20";
  }
  return "bg-slate-100 dark:bg-[#262B40]";
};

const getIconColor = (title) => {
  const t = title?.trim() || "";
  if (
    t.includes("کار") ||
    t.includes("دفتر") ||
    t.toLowerCase().includes("work")
  ) {
    return "text-sky-600 dark:text-sky-400";
  }
  return "text-slate-600 dark:text-[#8AA1C4]";
};

export default function SavedAddressesPage({
  addresses,
  onBack,
  onDelete,
  onUpdate,
  onSelect,
}) {
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleEdit = (e, item) => {
    e.stopPropagation();
    setEditingItem(item);
  };

  const handleCloseModal = () => setEditingItem(null);

  const handleEditSubmit = ({ plaque, unit, title, description }) => {
    if (!editingItem) return;

    onUpdate(editingItem.id, {
      title: title || editingItem.title,
      address_detail: editingItem.address_detail,
      apartment_name: plaque,
      unit: parseInt(unit) || 1,
      description: description || "",
      province: editingItem.province,
      city: editingItem.city,
      district: editingItem.district,
      postal_code: editingItem.postal_code,
      phone: editingItem.phone,
      latitude: editingItem.latitude,
      longitude: editingItem.longitude,
      is_default: editingItem.is_default,
    });

    handleCloseModal();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[2000] bg-white dark:bg-[#1a1f2e] flex flex-col"
    >
      {/* ============ HEADER ============ */}
<div className="bg-white dark:bg-[#1a1f2e] border-b border-gray-100 dark:border-gray-700">
  <div dir="ltr" className="flex items-center gap-3 px-4 py-4">
    {/* دکمه بک — سمت چپ (بدون تغییر) */}
    <button
      onClick={onBack}
      className="p-2.5 rounded-xl bg-gray-100 dark:bg-[#262B40] hover:bg-gray-200 dark:hover:bg-[#2d3350] transition active:scale-95"
    >
      <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
    </button>

    {/* شمارنده X/10 — الان اینجا (چپِ عنوان) */}
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/40">
      <MapPin size={14} className="text-sky-600 dark:text-sky-400" />
      <span className="text-xs font-bold text-sky-700 dark:text-sky-300">
        {addresses.length}/10
      </span>
    </div>

    {/* عنوان و زیرنویس — راست */}
    <div className="flex-1 text-right">
      <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
        آدرس‌های من
      </h1>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {addresses.length} آدرس ذخیره شده
      </p>
    </div>
  </div>
</div>

      {/* ============ LIST ============ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 pb-8">
          {addresses.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-3">
              {addresses.map((item) => (
                <AddressCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ EDIT MODAL ============ */}
      {editingItem && (
        <AddressModal
          isOpen={!!editingItem}
          onClose={handleCloseModal}
          onSubmit={handleEditSubmit}
          submitLabel="اعمال تغییرات"
          plaque={editingItem.apartment_name || ""}
          unit={String(editingItem.unit || "")}
          title={editingItem.title || ""}
          description={editingItem.description || ""}
          address={editingItem.address_detail || ""}
        />
      )}

      {/* ============ DELETE CONFIRM MODAL ============ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1f2e] w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <Trash2 size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-center text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
              حذف آدرس
            </h3>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              آیا از حذف این آدرس مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-[#262B40] text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 dark:hover:bg-[#2d3350] transition"
              >
                انصراف
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold transition"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ADDRESS CARD COMPONENT ============
function AddressCard({ item, onEdit, onDelete, onSelect }) {
  const Icon = getAddressIcon(item.title);
  const iconBg = getIconBg(item.title);
  const iconColor = getIconColor(item.title);

  return (
    <div
      onClick={() => onSelect?.(item)}
      className="group relative bg-white dark:bg-[#262B40] rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-sky-300 dark:hover:border-sky-700/50 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {/* ICON */}
        <div className={`shrink-0 w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
          <Icon size={22} className={iconColor} strokeWidth={2} />
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0">
          {/* Title + Badges */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">
              {item.title || "آدرس بدون عنوان"}
            </h3>
            {item.is_default && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/40">
                <Star size={10} className="text-sky-600 dark:text-sky-400 fill-sky-500" />
                <span className="font-bold text-sky-700 dark:text-sky-300">
                  پیش‌فرض
                </span>
              </span>
            )}
          </div>

          {/* Address */}
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-2.5 line-clamp-2">
            {item.address_detail || "آدرس ثبت نشده"}
          </p>

          {/* Meta Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.apartment_name && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700">
                <Hash size={12} className="text-gray-500 dark:text-gray-400" />
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  پلاک {item.apartment_name}
                </span>
              </div>
            )}
            {item.unit && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700">
                <Layers size={12} className="text-gray-500 dark:text-gray-400" />
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  واحد {item.unit}
                </span>
              </div>
            )}
            {item.city && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700">
                <Building2 size={12} className="text-gray-500 dark:text-gray-400" />
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  {item.city}
                </span>
              </div>
            )}
            {item.usage_count > 0 && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/40">
                <Clock size={12} className="text-sky-600 dark:text-sky-400" />
                <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
                  {item.usage_count} بار استفاده
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700">
              <MessageSquare
                size={14}
                className="text-gray-500 dark:text-[#8AA1C4] shrink-0 mt-0.5"
              />
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </div>
          )}
        </div>

        {/* ACTIONS - بزرگ‌تر شده */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={(e) => onEdit(e, item)}
            className="p-3 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:hover:bg-sky-900/40 transition active:scale-95"
            title="ویرایش"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={(e) => onDelete(e, item.id)}
            className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition active:scale-95"
            title="حذف"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ EMPTY STATE ============
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center mb-6">
        <MapPin size={40} className="text-sky-500 dark:text-sky-400" strokeWidth={2} />
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
        هنوز آدرسی ذخیره نکرده‌اید
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        آدرس‌های پرکاربرد خود را ذخیره کنید تا در سفارش‌های بعدی سریع‌تر انتخاب کنید.
      </p>
    </div>
  );
}