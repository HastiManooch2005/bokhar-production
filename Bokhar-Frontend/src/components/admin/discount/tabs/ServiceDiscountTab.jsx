import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../../api/clientApi";
import DiscountModal from "../modals/DiscountModal";
import TabModal from "../modals/TabModal";
import HorizontalScroller from "../../../../components/HorizontalScroller";
import Search from "../../../../components/Search";

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

function getDiscountStatus(product) {
  if (!product?.pricing && !product?.category?.discount) return null;

  const now = new Date();

  if (product?.category?.discount) {
    const d = product.category.discount;
    const start = d.start_at ? new Date(d.start_at) : null;
    const end = d.end_at ? new Date(d.end_at) : null;
    
    if (d.is_active !== false) {
      if (!start && !end) {
        return { type: "no_time", source: "category", value: d.value, discountType: d.type };
      }
      if (start && now < start) {
        return { type: "before", start, source: "category" };
      }
      if ((!start || now >= start) && (!end || now <= end)) {
        return { type: "running", end, source: "category", value: d.value, discountType: d.type };
      }
    }
  }

  for (const tab of Object.values(product.pricing || {})) {
    for (const m of tab.materialPrices || []) {
      if (!m.has_discount) continue;

      const start = m.discount_start_at ? new Date(m.discount_start_at) : null;
      const end = m.discount_end_at ? new Date(m.discount_end_at) : null;

      if (!start && !end) {
        return { type: "no_time", source: "material" };
      }

      if (start && now < start) {
        return { type: "before", start, source: "material" };
      }

      if ((!start || now >= start) && (!end || now <= end)) {
        return { type: "running", end, source: "material" };
      }
    }
  }

  return null;
}

function formatRemaining(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (day > 0) return `${day} روز`;
  if (hour > 0) return `${hour} ساعت`;
  if (min > 0) return `${min} دقیقه`;
  return "چند لحظه";
}

/* --------------------------------------------------
   Badge Component
-------------------------------------------------- */

function DiscountBadge({ product }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const status = useMemo(
    () => getDiscountStatus(product),
    [product, now]
  );

  if (!status) return null;

  let text = "";
  let color = "";

  if (status.type === "before") {
    text = `شروع تا ${formatRemaining(status.start - now)}`;
    color = "bg-yellow-100 text-yellow-700 border-yellow-300";
  }

  if (status.type === "running") {
    text = status.end
      ? `پایان تا ${formatRemaining(status.end - now)}`
      : "تخفیف فعال";
    color = "bg-green-100 text-green-700 border-green-300";
  }

  if (status.type === "no_time") {
    text = "تخفیف بدون محدودیت";
    color = "bg-sky-100 text-sky-700 border-sky-300";
  }

  return (
    <div
      className={`
        absolute -top-2 right-2 px-2 py-0.5
        rounded-lg text-[10px] font-semibold
        border backdrop-blur z-10
        ${color}
      `}
    >
      {text}
    </div>
  );
}

/* --------------------------------------------------
   Main Component
-------------------------------------------------- */

export default function ServiceDiscountTab() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [categoryModal, setCategoryModal] = useState(null);
  const [productModal, setProductModal] = useState(null);

  const [animateGlow, setAnimateGlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimateGlow(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await api.getCategories();
      setCategories(data);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const data = query.trim()
        ? await api.searchProducts(query)
        : await api.getProducts();
      setProducts(data);
    })();
  }, [query]);

  useEffect(() => {
    if (!products.length) return;

    products.forEach((p) => {
      if (p.pricing) return;

      api.getProduct(p.id).then((full) => {
        setProducts((prev) =>
          prev.map((x) =>
            x.id === p.id ? { ...x, pricing: full.pricing } : x
          )
        );
      });
    });
  }, [products]);

  const hasDiscount = (product) => {
    if (product?.category?.discount) {
      const d = product.category.discount;
      const now = new Date();
      const start = d.start_at ? new Date(d.start_at) : null;
      const end = d.end_at ? new Date(d.end_at) : null;
      
      const isActive = d.is_active !== false;
      
      if (!isActive) return false;
      
      if (!start && !end) return true;
      if (start && now < start) return true;
      if ((!start || now >= start) && (!end || now <= end)) return true;
    }
    
    if (!product?.pricing) return false;
    return Object.values(product.pricing).some((tab) =>
      tab.materialPrices?.some((m) => Number(m.discount_amount) > 0)
    );
  };

  const refreshProducts = async () => {
    setLoading(true);
    try {
      const data = query.trim()
        ? await api.searchProducts(query)
        : await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error("Error refreshing:", err);
    } finally {
      setLoading(false);
    }
  };

  const glowIds = useMemo(
    () => products.filter(hasDiscount).map((p) => p.id),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter((p) => p.category?.id === selectedCategory);
  }, [products, selectedCategory]);

  const openProductModal = async (product) => {
    const fullData = await api.getProduct(product.id);

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, pricing: fullData.pricing } : p
      )
    );

    setProductModal(fullData);
  };

  const closeProductModal = () => setProductModal(null);
  const openCategoryModal = (c) => setCategoryModal(c);
  const closeCategoryModal = () => setCategoryModal(null);

  const cardsRef = useRef({});
  const [visibleCards, setVisibleCards] = useState({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const id = entry.target.dataset.id;

          setTimeout(() => {
            setVisibleCards((prev) => ({ ...prev, [id]: true }));
          }, 15);

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    Object.values(cardsRef.current).forEach((el) => el && observer.observe(el));

    return () => observer.disconnect();
  }, [filteredProducts]);

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8 px-3 md:px-4 overflow-x-hidden">

      {/* دسته‌ها */}
      <div className="
        w-full p-4 md:p-5 rounded-2xl
        bg-white/70 dark:bg-[#262B40]/90 backdrop-blur-md
        border border-sky-200 dark:border-gray-600 shadow-lg
      ">
        <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-200">
          تخفیف روی دسته‌بندی‌ها
        </h3>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => openCategoryModal(c)}
              className="
                px-3 py-2 rounded-xl transition text-sm cursor-pointer
                bg-white dark:bg-[#262B40]
                text-gray-700 dark:text-gray-200
                border border-sky-200 dark:border-gray-600
                hover:bg-sky-100 dark:hover:bg-[#2d3350] hover:text-gray-900
              "
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* محصولات */}
      <div className="
        w-full p-4 md:p-5 rounded-2xl
        bg-white/70 dark:bg-[#262B40]/90 backdrop-blur
        border border-sky-200 dark:border-gray-600 shadow-lg
      ">
        <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-200">
          تخفیف روی محصولات
        </h3>

        <div className="mb-6">
          <HorizontalScroller className="pb-2 -mx-1 px-1 scrollbar-hide">
            <div className="flex gap-2 px-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`
                  px-4 py-2 mb-1 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  border flex-shrink-0 cursor-pointer
                  ${selectedCategory === "all"
                    ? "border border-sky-200 dark:border-gray-600 bg-gradient-to-r from-sky-100 to-sky-200 dark:from-[#8AA1C4] dark:to-[#8AA1C4] shadow text-gray-800 dark:text-white font-bold"
                      : "bg-white/70 dark:bg-[#262B40] text-gray-700 dark:text-gray-200 border border-sky-200 dark:border-gray-600 hover:bg-white dark:hover:bg-[#2d3350]"
                  }
                `}
              >
                همه 
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`
                    px-4 py-2 mb-1 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                    border flex-shrink-0 cursor-pointer
                    ${selectedCategory === c.id
                      ? "border border-sky-200 dark:border-gray-600 bg-gradient-to-r from-sky-100 to-sky-200 dark:from-[#8AA1C4] dark:to-[#8AA1C4] shadow text-gray-800 dark:text-white font-bold"
                      : "bg-white/70 dark:bg-[#262B40] text-gray-700 dark:text-gray-200 border border-sky-200 dark:border-gray-600 hover:bg-white dark:hover:bg-[#2d3350]"
                    }
                  `}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </HorizontalScroller>
        </div>

        <div className="mb-6">
          <Search
            value={query}
            onChange={setQuery}
            placeholder="جستجو در محصولات..."
            loading={loading}
            items={[]}
          />
        </div>

        {loading && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">در حال بارگذاری...</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              data-id={p.id}
              ref={(el) => (cardsRef.current[p.id] = el)}
              className={`
                relative p-3 rounded-xl bg-white/90 dark:bg-[#262B40]/80
                backdrop-blur border border-sky-200 dark:border-gray-600
                shadow-md flex flex-col transition-all duration-300
                hover:scale-[1.02]
                ${visibleCards[p.id] && glowIds.includes(p.id) ? "discount-glow" : ""}
              `}
              style={{
                opacity: visibleCards[p.id] ? 1 : 0,
                transform: visibleCards[p.id] ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease'
              }}
            >
              <DiscountBadge product={p} />

              <img
                src={p.image || "/images/placeholder.png"}
                alt={p.title}
                className="aspect-square object-cover rounded-lg mb-2 bg-gray-100 dark:bg-gray-700"
              />

              <h3 className="text-sm font-bold text-center truncate text-gray-800 dark:text-gray-200 px-1">
                {p.title}
              </h3>

              <button
                onClick={() => openProductModal(p)}
                className="
                  mt-3 w-full py-1.5 rounded-xl text-sm font-medium
                  bg-gradient-to-r from-sky-100 to-sky-200
                  dark:from-[#8AA1C4] dark:to-[#8AA1C4]
                  border border-sky-200 dark:border-gray-600
                  text-sky-800 dark:text-white
                  hover:from-sky-200 hover:to-sky-300
                  dark:hover:from-[#7a92b8] dark:hover:to-[#7a92b8]
                  transition-all active:scale-[0.98]
                "
              >
                تنظیم تخفیف
              </button>
            </div>
          ))}
        </div>
        
        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <div>محصولی یافت نشد</div>
          </div>
        )}
      </div>

      {productModal && (
        <DiscountModal
          product={productModal}
          isOpen
          onClose={closeProductModal}
        />
      )}

      {categoryModal && (
        <TabModal
          category={categoryModal}
          isOpen={!!categoryModal}
          onClose={closeCategoryModal}
          onSuccess={refreshProducts}  
        />
      )}

    </div>
  );
}