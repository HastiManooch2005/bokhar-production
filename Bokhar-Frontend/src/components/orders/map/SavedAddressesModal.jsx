import { useState } from "react";
import { X } from "lucide-react";
import SavedAddressList from "./SavedAddressList";
import AddressModal from "./AddressModal";

export default function SavedAddressesModal({
  isOpen,
  onClose,
  addresses,
  onDelete,
  onUpdate,
}) {
  const [editingItem, setEditingItem] = useState(null);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1a1f2e] p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            آدرس‌های ذخیره شده
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262B40] transition"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {addresses.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
            هنوز آدرسی ذخیره نکرده‌اید.
          </p>
        ) : (
          <SavedAddressList
            addresses={addresses}
            onSelect={() => {}}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

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