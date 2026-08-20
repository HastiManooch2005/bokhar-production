import { useState } from "react";
import { ArrowRight, MapPin, Pencil, Trash2 } from "lucide-react";
import AddressModal from "./AddressModal";

export default function SavedAddressesPage({
  addresses,
  onBack,
  onDelete,
  onUpdate,
  onSelect,
}) {
  const [editingItem, setEditingItem] = useState(null);

  const handleEdit = (item) => {
    setEditingItem(item);
  };

  const handleEditSubmit = ({ plaque, unit, title, description }) => {
    if (!editingItem) return;

    onUpdate(editingItem.id, {
      title,
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
    setEditingItem(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("آیا از حذف این آدرس مطمئنید؟")) {
      onDelete(id);
    }
  };

  const formatAddress = (item) => {
    const parts = [];
    if (item.address_detail) parts.push(item.address_detail);
    if (item.apartment_name) parts.push(`پلاک ${item.apartment_name}`);
    if (item.unit) parts.push(`واحد ${item.unit}`);
    return parts.join("، ");
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[2000] bg-white dark:bg-[#1a1f2e] flex flex-col"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#262B40] transition active:scale-95"
        >
          <ArrowRight size={22} className="text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
          آدرس‌های ذخیره شده
        </h1>
        <span className="mr-auto text-xs text-gray-400 dark:text-gray-500">
          {addresses.length} آدرس
        </span>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-4">
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <MapPin size={48} className="mb-3 opacity-40" />
            <p className="text-sm">هنوز آدرسی ذخیره نکرده‌اید.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {addresses.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-2xl border bg-white dark:bg-[#262B40] dark:border-gray-700 p-4 shadow-sm"
              >
                {/* INFO — clickable to select */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelect?.(item)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">
                      {item.title}
                    </h3>
                    {item.is_default && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                        پیش‌فرض
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {formatAddress(item)}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2.5 rounded-xl bg-sky-100 text-sky-600 hover:bg-sky-200 dark:bg-[#1a1f2e] dark:text-[#8AA1C4] dark:hover:bg-[#2d3350] transition active:scale-95"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition active:scale-95"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <AddressModal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSubmit={handleEditSubmit}
          plaque={editingItem.apartment_name || ""}
          unit={String(editingItem.unit || "")}
          title={editingItem.title || ""}
          description={editingItem.description || ""}
          address={editingItem.address_detail || ""}
        />
      )}
    </div>
  );
}