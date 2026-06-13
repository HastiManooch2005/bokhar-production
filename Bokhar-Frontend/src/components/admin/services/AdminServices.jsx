import { useState, useContext, useRef, useEffect } from "react";
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
} from "react-icons/fi";
import Sidebar from "../Sidebar";
import ServicesModal from "./ServicesModal";
import { ServicesContext } from "./ServicesContext";
import Search from "../../Search";
import api from "./servicesApi";
import HorizontalScroller from "../../HorizontalScroller";

function ConfirmToast({ message, onConfirm, onCancel }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 flex items-end sm:items-start justify-center sm:pt-6 z-[9999] px-4 pb-6 sm:pb-0 pointer-events-none">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-indigo-600 p-5 w-full max-w-sm pointer-events-auto backdrop-blur-xl animate-slide-up">
        <p className="text-gray-800 dark:text-gray-200 font-medium text-center mb-4">
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 text-gray-700 dark:text-gray-200 transition font-medium"
          >
            انصراف
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition font-medium"
          >
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminServices() {
  const { categories, services, refreshData } = useContext(ServicesContext);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("services");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirm, setConfirm] = useState({ message: "", onConfirm: null });
  const [toast, setToast] = useState({ message: "", type: "success" });

  const [selectedCategory, setSelectedCategory] = useState("all");

  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, "fa"),
  );

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message, type: "success" }), 3000);
  };

  const showConfirm = (message, onConfirm) => {
    setConfirm({ message, onConfirm });
  };

  const addCategory = async () => {
    const c = newCat.trim();
    if (c && !categories.find((cat) => cat.name === c)) {
      try {
        await api.createCategory(c);
        await refreshData();
        setNewCat("");
        showToast("دسته‌بندی با موفقیت اضافه شد");
      } catch (err) {
        showToast("خطا در ایجاد دسته‌بندی: " + err.message, "error");
      }
    }
  };

  const deleteCategory = (cat) => {
    showConfirm(`آیا از حذف "${cat.name}" اطمینان دارید؟`, async () => {
      setConfirm({ message: "", onConfirm: null });
      try {
        await api.deleteCategory(cat.id);
        await refreshData();
        showToast("دسته‌بندی حذف شد");
      } catch (err) {
        showToast("خطا در حذف دسته‌بندی: " + err.message, "error");
      }
    });
  };

  const saveService = async (data) => {
    setIsLoading(true);
    try {
      const catObj = categories.find((c) => c.name === data.category);
      const categoryId = catObj ? catObj.id : null;

      const apiData = {
        title: data.title,
        category: categoryId,
        status: "active",
        pricing: data.pricing,
        imageFile: data.imageFile, // اضافه کردن فایل تصویر
        base_price: 0,
      };

      if (editItem) {
        await api.updateProduct(editItem.id, apiData);
      } else {
        await api.createProduct(apiData);
      }

      await refreshData();
      setEditItem(null);
      setModalOpen(false);
      showToast(editItem ? "سرویس ویرایش شد" : "سرویس جدید اضافه شد");
    } catch (err) {
      showToast("خطا در ذخیره‌سازی: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = async (id) => {
    setIsLoading(true);
    try {
      const product = await api.getProduct(id);
      const modalData = {
        ...product,
        category: product.category?.name || product.category,
        pricing: product.pricing || {},
        imageUrl: product.image, // اضافه کردن URL تصویر موجود برای نمایش در مودال
      };
      setEditItem(modalData);
      setModalOpen(true);
    } catch (err) {
      showToast("خطا در دریافت اطلاعات سرویس", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteService = (id) => {
    showConfirm("آیا از حذف این سرویس اطمینان دارید؟", async () => {
      setConfirm({ message: "", onConfirm: null });
      try {
        await api.deleteProduct(id);
        await refreshData();
        showToast("سرویس حذف شد");
      } catch (err) {
        showToast("خطا در حذف سرویس: " + err.message, "error");
      }
    });
  };

  const filteredServices = services
    .filter((s) => s.title?.toLowerCase().includes(search.toLowerCase()))
    .filter(
      (s) =>
        selectedCategory === "all" || s.category?.name === selectedCategory,
    );

  const activeServices = filteredServices.filter((s) => s.status === "active");
  const categoryNames = sortedCategories.map((c) => c.name);

  return (
    <div dir="rtl" className="flex min-h-screen overflow-x-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      {toast.message && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white shadow-xl z-[9999] transition-all ${
            toast.type === "error"
              ? "bg-red-500"
              : "bg-green-600 shadow-indigo-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <ConfirmToast
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm({ message: "", onConfirm: null })}
      />

      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 md:mr-64">
        <h1 className="flex items-center justify-center md:justify-start gap-2 text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">
          <FiPackage className="text-2xl" />
          خدمات
        </h1>

        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 p-4 rounded-xl backdrop-blur-xl">
              در حال بارگذاری...
            </div>
          </div>
        )}

        <div className="space-y-10 max-w-full">
          {/* ----------------------- */}
          {/* دسته‌بندی‌ها */}
          {/* ----------------------- */}
          <div className="p-6 rounded-3xl bg-white/30 dark:bg-white/40 backdrop-blur-lg border border-sky-200 dark:border-indigo-600 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-900">
              دسته‌بندی‌ها
            </h2>

<div className="flex items-center gap-2 mb-4">
                <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="نام دسته جدید"
                className="flex-1 min-w-0 p-3 h-12 rounded-xl border border-sky-200 dark:border-indigo-600 bg-white/80 dark:bg-neutral-800 shadow text-slate-800 dark:text-gray-200"
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <button
                onClick={addCategory}
                disabled={isLoading}
                className="px-3 sm:px-4 h-12 shrink-0 rounded-xl bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 border border-sky-200 dark:border-indigo-600 shadow-lg text-gray-800 dark:text-white flex items-center gap-2 shrink-0 cursor-pointer hover:scale-105 transition disabled:opacity-50"
              >
                <FiPlus /> افزودن
              </button>
            </div>

            <HorizontalScroller className="mb-2" innerClassName="gap-3">
              {sortedCategories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 mx-1 mb-4 px-4 py-2 rounded-xl border border-sky-200 dark:border-indigo-600 bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 shadow text-gray-800 dark:text-white shrink-0 select-none"
                >
                  <span className="truncate whitespace-nowrap">{c.name}</span>
                  <button
                    onClick={() => deleteCategory(c)}
                    disabled={isLoading}
                    className="hover:scale-110 transition-transform cursor-pointer"
                  >
                    <FiTrash2 className="text-red-600" />
                  </button>
                </div>
              ))}
            </HorizontalScroller>
          </div>

          {/* ----------------------- */}
          {/* خدمات */}
          {/* ----------------------- */}
          <div className="p-6 rounded-3xl bg-white/30 dark:bg-white/40 backdrop-blur-lg border border-sky-200 dark:border-indigo-600 shadow-xl">
            <div className="mb-6">
              <Search
                value={search}
                onChange={setSearch}
                items={[]}
                placeholder="جستجو بر اساس عنوان سرویس..."
              />
            </div>

            {/* فیلتر دسته‌بندی‌ها با اسکرول نرم */}
            <HorizontalScroller className="mb-6" innerClassName="gap-3">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 mx-0.5 mb-4 rounded-xl whitespace-nowrap cursor-pointer shrink-0 transition-all ${
                  selectedCategory === "all"
                    ? "border border-sky-200 dark:border-indigo-600 bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 shadow text-gray-800 dark:text-white font-bold"
                    : "bg-white/70 dark:bg-neutral-700 text-gray-700 dark:text-gray-200 border border-sky-200 dark:border-gray-600 hover:bg-white"
                }`}
              >
                همه
              </button>

              {sortedCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-2 mx-0.5 mb-4 rounded-xl whitespace-nowrap cursor-pointer shrink-0 transition-all ${
                    selectedCategory === cat.name
                      ? "border border-sky-200 dark:border-indigo-600 bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 shadow text-gray-800 dark:text-white font-bold"
                      : "bg-white/70 dark:bg-neutral-700 text-gray-700 dark:text-gray-200 border border-sky-200 dark:border-gray-600 hover:bg-white"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </HorizontalScroller>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {/* کارت افزودن سرویس */}
              <div
                onClick={() => {
                  setEditItem(null);
                  setModalOpen(true);
                }}
                className="flex flex-col items-center justify-center rounded-2xl cursor-pointer bg-gradient-to-r from-sky-100 to-sky-200 dark:from-purple-700 dark:to-purple-800 border border-sky-200 dark:border-indigo-600 shadow-xl text-gray-800 dark:text-white hover:scale-105 transition-all p-4 min-h-[220px]"
              >
                <div className="w-14 h-14 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center mb-2 shadow">
                  <FiPlus className="text-3xl" />
                </div>
                <p className="font-semibold text-sm md:text-md lg:text-lg">
                  افزودن سرویس
                </p>
              </div>

              {/* کارت سرویس */}
              {activeServices.map((srv) => (
                <div
                  key={srv.id}
                  className="p-4 rounded-2xl bg-white/70 dark:bg-neutral-800/80 backdrop-blur-lg border border-sky-200 dark:border-indigo-600 shadow-xl flex flex-col justify-between min-h-[220px] hover:scale-[1.03] transition"
                >
                  <div>
                    <div className="w-full aspect-[4/3] mb-3">
                      <img
                        src={
                          srv.image
                            ? srv.image.startsWith("http")
                              ? srv.image
                              : `${import.meta.env.VITE_API_URL?.replace("/api", "")}${srv.image}`
                            : "/images/placeholder.png"
                        }
                        alt={srv.title}
                        className="w-full h-full object-cover rounded-xl border border-sky-200 dark:border-indigo-600 shadow"
                      />
                    </div>
                    <h3 className="font-bold text-center truncate text-slate-800 dark:text-gray-100">
                      {srv.title || "بدون عنوان"}
                    </h3>
                    <p className="text-center text-sm mt-1 text-slate-600 dark:text-gray-300 truncate">
                      دسته: {srv.category?.name || srv.category || "-"}
                    </p>
                  </div>

                  <div className="flex justify-between mt-3 ">
                    <button
                      className="text-blue-600 dark:text-indigo-400 cursor-pointer hover:scale-110 transition"
                      onClick={() => openEdit(srv.id)}
                    >
                      <FiEdit />
                    </button>
                    <button
                      className="text-red-600 cursor-pointer hover:scale-110 transition"
                      onClick={() => deleteService(srv.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {modalOpen && (
            <ServicesModal
              isOpen={modalOpen}
              categories={categoryNames}
              editItem={editItem}
              onClose={() => setModalOpen(false)}
              onSave={saveService}
              isLoading={isLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}
