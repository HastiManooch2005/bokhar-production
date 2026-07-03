import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import BaseModal from "../../basemodal/BaseModal";

const defaultTabs = ["اتو", "خشکشویی", "سفیدشویی", "ویژه"];
const defaultMaterials = ["چرم", "مخمل", "نخی", "کتان"];

const makeEmptyPricing = (currentTabs) =>
  currentTabs.reduce(
    (acc, tab) => ({ ...acc, [tab]: { materialPrices: {}, sizeType: "" } }),
    {}
  );

const mergePricing = (saved = {}, currentTabs) => {
  const base = makeEmptyPricing(currentTabs);

  for (const tab of currentTabs) {
    const tabData = saved?.[tab];
    if (!tabData) continue;

    let materialPrices = {};

    if (Array.isArray(tabData.materialPrices)) {
      materialPrices = Object.fromEntries(
        tabData.materialPrices.map((mp) => [mp.material, String(mp.price)])
      );
    } else if (typeof tabData.materialPrices === "object" && tabData.materialPrices !== null) {
      materialPrices = tabData.materialPrices;
    }

    base[tab] = {
      materialPrices,
      sizeType: tabData.sizeType || "",
    };
  }

  return base;
};

function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return createPortal(
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-white shadow-xl z-[9999] flex items-center gap-4 ${
        type === "error" ? "bg-red-500" : "bg-green-500"
      }`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="font-bold text-lg leading-none">
        ×
      </button>
    </div>,
    document.body
  );
}

function MaterialPriceInput({ mat, value, onToggle, onChange, onDelete }) {
  const active = value !== undefined && value !== null;
  return (
    <div className="flex gap-3 items-center group">
      <button
        type="button"
        onClick={onToggle}
        className={`px-3 py-2 rounded-xl transition min-w-[60px] flex items-center justify-center gap-2 ${
          active ? "bg-[#8AA1C4] text-white" : "bg-gray-100 dark:bg-[#262B40] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#2d3350]"
        }`}
      >
        {mat}
        {active && (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-red-200 text-xs font-bold transition-opacity"
          >
            ×
          </span>
        )}
      </button>
      {active && (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="قیمت (تومان)"
          className="flex-1 p-2 rounded-xl bg-gray-100 dark:bg-[#1a1f2e] dark:text-gray-200 dark:border-gray-600"
          min="0"
        />
      )}
    </div>
  );
}

function SizeSelector({ value, onChange }) {
  return (
    <div className="relative mb-4">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 text-sm rounded-xl bg-gray-100 dark:bg-[#1a1f2e] dark:text-gray-200 dark:border-gray-600 appearance-none"
      >
        <option value="">هیچکدام</option>
        <option value="singleDouble">تک نفره / دو نفره</option>
        <option value="meter">متر مربع (متراژی)</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs dark:text-gray-400">
        ▼
      </div>
    </div>
  );
}

export default function ServicesModal({
  isOpen,
  onClose,
  categories,
  editItem,
  onSave,
  isLoading,
}) {
  const [tabs, setTabs] = useState(defaultTabs);
  const [materials, setMaterials] = useState(defaultMaterials);
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({
    title: "",
    category: categories[0] || "",
    pricing: makeEmptyPricing(defaultTabs),
  });
  const [toast, setToast] = useState({ message: "", type: "error" });
  
  const [newTabName, setNewTabName] = useState("");
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // State و Ref برای تصویر
  const [serviceImage, setServiceImage] = useState(null);
  const [serviceImageFile, setServiceImageFile] = useState(null);
  const fileInputRef = useRef(null);

  // Handlerهای تصویر
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setServiceImageFile(file);
      setServiceImage(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setServiceImage(null);
    setServiceImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    setActiveTab(0);
    if (editItem) {
      const savedTabs = editItem.pricing ? Object.keys(editItem.pricing) : [];
      const mergedTabs = [...new Set([...defaultTabs, ...savedTabs])];
      setTabs(mergedTabs);
      
      const savedMaterials = new Set();
      for (const tabData of Object.values(editItem.pricing || {})) {
        if (tabData.materialPrices) {
          if (Array.isArray(tabData.materialPrices)) {
            tabData.materialPrices.forEach(mp => savedMaterials.add(mp.material));
          } else {
            Object.keys(tabData.materialPrices).forEach(m => savedMaterials.add(m));
          }
        }
      }
      const mergedMaterials = [...new Set([...defaultMaterials, ...savedMaterials])];
      setMaterials(mergedMaterials);
      
      setForm({
        title: editItem.title || "",
        category: editItem.category || categories[0] || "",
        pricing: mergePricing(editItem.pricing, mergedTabs),
      });

      // اگر تصویر قبلی وجود داشت (از طریق imageUrl یا image)
      if (editItem.imageUrl || editItem.image) {
        setServiceImage(editItem.imageUrl || editItem.image);
      } else {
        setServiceImage(null);
      }
      // در حالت ویرایش، فایل جدیدی انتخاب نشده است
      setServiceImageFile(null);
    } else {
      setTabs(defaultTabs);
      setMaterials(defaultMaterials);
      setForm({
        title: "",
        category: categories[0] || "",
        pricing: makeEmptyPricing(defaultTabs),
      });
      setServiceImage(null);
      setServiceImageFile(null);
    }
    setNewTabName("");
    setNewMaterialName("");
    setIsAddingTab(false);
    setIsAddingMaterial(false);
  }, [editItem, isOpen, categories]);

  const currentTab = tabs[activeTab];
  const data = form.pricing[currentTab] || { materialPrices: {}, sizeType: "" };

  const addTab = () => {
    const trimmed = newTabName.trim();
    if (!trimmed) return;
    if (tabs.includes(trimmed)) {
      setToast({ message: "این تب قبلاً وجود دارد.", type: "error" });
      return;
    }
    
    setTabs([...tabs, trimmed]);
    setForm(f => ({
      ...f,
      pricing: {
        ...f.pricing,
        [trimmed]: { materialPrices: {}, sizeType: "" }
      }
    }));
    setNewTabName("");
    setIsAddingTab(false);
    setTimeout(() => setActiveTab(tabs.length), 0);
  };

  const removeTab = (tabToRemove) => {
    if (tabs.length <= 1) {
      setToast({ message: "حداقل باید یک تب وجود داشته باشد.", type: "error" });
      return;
    }
    
    const tabIndex = tabs.indexOf(tabToRemove);
    const newTabs = tabs.filter(t => t !== tabToRemove);
    setTabs(newTabs);
    
    setForm(f => {
      const newPricing = { ...f.pricing };
      delete newPricing[tabToRemove];
      return { ...f, pricing: newPricing };
    });
    
    if (activeTab >= tabIndex && activeTab > 0) {
      setActiveTab(activeTab - 1);
    } else if (activeTab >= newTabs.length) {
      setActiveTab(newTabs.length - 1);
    }
  };

  const addMaterial = () => {
    const trimmed = newMaterialName.trim();
    if (!trimmed) return;
    if (materials.includes(trimmed)) {
      setToast({ message: "این جنس قبلاً وجود دارد.", type: "error" });
      return;
    }
    
    setMaterials([...materials, trimmed]);
    setNewMaterialName("");
    setIsAddingMaterial(false);
  };

  const removeMaterial = (matToRemove) => {
    if (materials.length <= 1) {
      setToast({ message: "حداقل باید یک جنس وجود داشته باشد.", type: "error" });
      return;
    }
    
    setMaterials(materials.filter(m => m !== matToRemove));
    
    setForm(f => ({
      ...f,
      pricing: Object.fromEntries(
        Object.entries(f.pricing).map(([tab, tabData]) => [
          tab,
          {
            ...tabData,
            materialPrices: Object.fromEntries(
              Object.entries(tabData.materialPrices || {}).filter(([k]) => k !== matToRemove)
            )
          }
        ])
      )
    }));
  };

  const setPricingField = useCallback(
    (field, value) => {
      if (!currentTab) return;
      setForm((f) => ({
        ...f,
        pricing: {
          ...f.pricing,
          [currentTab]: {
            ...f.pricing[currentTab],
            [field]: value,
          },
        },
      }));
    },
    [currentTab]
  );

  const toggleMaterial = useCallback(
    (mat) => {
      if (!currentTab) return;
      setForm((f) => {
        const currentPrices = f.pricing[currentTab]?.materialPrices || {};
        const active =
          currentPrices[mat] !== undefined && currentPrices[mat] !== null;
        const newMaterials = active
          ? Object.fromEntries(
              Object.entries(currentPrices).filter(([k]) => k !== mat)
            )
          : { ...currentPrices, [mat]: "" };
        return {
          ...f,
          pricing: {
            ...f.pricing,
            [currentTab]: {
              ...f.pricing[currentTab],
              materialPrices: newMaterials,
            },
          },
        };
      });
    },
    [currentTab]
  );

  const setMaterialPrice = useCallback(
    (mat, value) => {
      if (!currentTab) return;
      setForm((f) => ({
        ...f,
        pricing: {
          ...f.pricing,
          [currentTab]: {
            ...f.pricing[currentTab],
            materialPrices: {
              ...f.pricing[currentTab]?.materialPrices,
              [mat]: value,
            },
          },
        },
      }));
    },
    [currentTab]
  );

  const validateForm = () => {
    if (!form.title.trim()) {
      setToast({ message: "لطفاً عنوان سرویس را وارد کنید.", type: "error" });
      return false;
    }
    if (!form.category) {
      setToast({ message: "لطفاً دسته‌بندی را انتخاب کنید.", type: "error" });
      return false;
    }

    let hasAnyMaterial = false;
    for (const tab of tabs) {
      const tabData = form.pricing[tab];
      if (tabData?.materialPrices && Object.keys(tabData.materialPrices).length > 0) {
        hasAnyMaterial = true;
        for (const [mat, price] of Object.entries(tabData.materialPrices)) {
          if (!price || isNaN(parseInt(price)) || parseInt(price) < 0) {
            setToast({
              message: `قیمت "${mat}" در تب "${tab}" نامعتبر است.`,
              type: "error",
            });
            return false;
          }
        }
      }
    }

    if (!hasAnyMaterial) {
      setToast({
        message: "حداقل برای یک تب، یک جنس انتخاب کنید.",
        type: "error",
      });
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const cleanPricing = {};

    for (const [tab, tabData] of Object.entries(form.pricing)) {
      const cleanMaterials = {};

      for (const [mat, price] of Object.entries(
        tabData.materialPrices || {}
      )) {
        if (price !== "" && price !== null && !isNaN(price)) {
          cleanMaterials[mat] = String(price);
        }
      }

      if (Object.keys(cleanMaterials).length > 0) {
        cleanPricing[tab] = {
          materialPrices: cleanMaterials,
          sizeType: tabData.sizeType || "",
        };
      }
    }

    // ارسال فایل تصویر به همراه بقیه داده‌ها
    const dataToSave = {
      ...form,
      pricing: cleanPricing,
      imageFile: serviceImageFile, // فایل تصویر جدید (اگر انتخاب شده باشد)
      image: serviceImage // URL تصویر فعلی (برای نمایش)
    };

    onSave(dataToSave);
  };

  const isValid = form.title.trim() && form.category;

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center justify-between w-full">
            <span>{editItem ? "ویرایش سرویس" : "سرویس جدید"}</span>
            <button
              type="button"
              onClick={handleImageClick}
              className="p-1.5 mr-2 text-gray-500 hover:text-[#8AA1C4] hover:bg-[#8AA1C4]/10 rounded-full transition-all"
              title="افزودن تصویر"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
          </div>
        }
      >
        {/* input مخفی برای انتخاب فایل */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        <div dir="rtl" className="space-y-4 max-h-[80vh] px-1 overflow-y-auto">
          {/* پیش‌نمایش تصویر */}
          {serviceImage && (
            <div className="relative">
              <img 
                src={serviceImage} 
                alt="پیش‌نمایش سرویس" 
                className="w-full h-32 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow-md"
              >
                ×
              </button>
            </div>
          )}

          {/* عنوان و دسته‌بندی */}
          <div className="flex gap-2 mt-1 mb-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="عنوان سرویس"
              className="flex-1 h-10 px-3 text-sm rounded-xl bg-gray-100 dark:bg-[#1a1f2e] dark:text-gray-200 dark:border-gray-600"
              disabled={isLoading}
            />
            <div className="flex-1 relative">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-xl bg-gray-100 dark:bg-[#1a1f2e] dark:text-gray-200 dark:border-gray-600 appearance-none"
                disabled={isLoading}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs dark:text-gray-400">
                ▼
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex relative gap-1 z-10 -mb-0.5">
            {tabs.map((tab, i) => {
              const hasData =
                form.pricing[tab]?.materialPrices &&
                Object.keys(form.pricing[tab].materialPrices).length > 0;
              return (
                <div key={i} className="flex-1 relative group">
                  <button
                    type="button"
                    onClick={() => setActiveTab(i)}
                    className={`w-full py-2 text-sm border rounded-t-xl transition relative ${
                      activeTab === i
                        ? "bg-white dark:bg-[#262B40] border-gray-200 dark:border-gray-600 border-b-white dark:border-b-[#262B40] z-20 font-semibold dark:text-gray-200"
                        : "bg-gray-200 dark:bg-[#1a1f2e] border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-[#2d3350]"
                    }`}
                  >
                    {tab}
                    {hasData && activeTab !== i && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTab(tab);
                      }}
                      className="absolute -top-2 -left-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30 hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            
            {/* دکمه + برای تب */}
            {!isAddingTab ? (
              <button
                type="button"
                onClick={() => setIsAddingTab(true)}
                className="py-2 px-3 text-sm border rounded-t-xl bg-purple-100 dark:bg-[#262B40] text-purple-700 dark:text-[#8AA1C4] border-transparent hover:bg-purple-200 dark:hover:bg-[#2d3350] transition"
              >
                +
              </button>
            ) : (
              <div className="flex-1 flex items-center gap-1 px-2 py-1 border border-purple-300 dark:border-gray-600 rounded-t-xl bg-purple-50 dark:bg-[#262B40] border-b-white dark:border-b-[#262B40]">
                <input
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="نام تب"
                  className="flex-1 h-7 px-2 text-xs rounded bg-white dark:bg-[#1a1f2e] dark:text-gray-200 border-none outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTab();
                    if (e.key === 'Escape') {
                      setIsAddingTab(false);
                      setNewTabName("");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addTab}
                  className="text-green-600 hover:text-green-800 text-sm font-bold px-1"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTab(false);
                    setNewTabName("");
                  }}
                  className="text-red-600 hover:text-red-800 text-sm font-bold px-1"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* محتوای تب */}
          <div className="bg-white dark:bg-[#262B40] border border-gray-200 dark:border-gray-600 rounded-b-xl p-3 max-h-[50vh] overflow-y-auto">
            <div className="mb-5">
              {/* دراپ‌داون نوع قیمت‌گذاری - بالای لیست جنس‌ها */}
              <SizeSelector
                value={data.sizeType}
                onChange={(v) => setPricingField("sizeType", v)}
              />
              <div className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
                جنس‌ها
              </div>
              
              
              <div className="space-y-3">
                {materials.map((mat) => (
                  <MaterialPriceInput
                    key={mat}
                    mat={mat}
                    value={data.materialPrices?.[mat]}
                    onToggle={() => toggleMaterial(mat)}
                    onChange={(v) => setMaterialPrice(mat, v)}
                    onDelete={() => removeMaterial(mat)}
                  />
                ))}
                
                {/* دکمه + برای جنس در پایین لیست */}
                {!isAddingMaterial ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingMaterial(true)}
                    className="w-full py-2 text-sm rounded-xl bg-gray-100 dark:bg-[#1a1f2e] text-gray-600 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-[#2d3350] hover:border-gray-400 transition"
                  >
                    + افزودن جنس جدید
                  </button>
                ) : (
                  <div className="flex gap-2 items-center py-2">
                    <input
                      value={newMaterialName}
                      onChange={(e) => setNewMaterialName(e.target.value)}
                      placeholder="نام جنس جدید"
                      className="flex-1 h-9 px-3 text-sm rounded-xl bg-gray-100 dark:bg-[#1a1f2e] dark:text-gray-200 border border-gray-300 dark:border-gray-600 outline-none focus:border-[#8AA1C4]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addMaterial();
                        if (e.key === 'Escape') {
                          setIsAddingMaterial(false);
                          setNewMaterialName("");
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addMaterial}
                      className="h-9 px-3 rounded-xl bg-green-600 text-white text-sm hover:bg-green-700"
                    >
                      تایید
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMaterial(false);
                        setNewMaterialName("");
                      }}
                      className="h-9 px-3 rounded-xl bg-gray-200 dark:bg-[#262B40] text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-[#2d3350]"
                    >
                      انصراف
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-[#262B40] dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-[#2d3350] transition"
              disabled={isLoading}
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid || isLoading}
              className="px-6 py-2 rounded-xl bg-purple-600 dark:bg-[#8AA1C4] text-white disabled:opacity-50 hover:bg-purple-700 dark:hover:bg-[#7a93b8] transition"
            >
              {isLoading ? "در حال ذخیره..." : "ذخیره"}
            </button>
          </div>
        </div>
      </BaseModal>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "error" })}
      />
    </>
  );
}