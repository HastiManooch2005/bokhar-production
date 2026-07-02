import { useState, useEffect, useMemo, useCallback } from "react";
import CategoryTabs from "../components/CategoryTabs";
import Card from "../components/Card";
import Search from "../components/Search";
import clientApi from "../api/clientApi";

// تابع چک کردن تخفیف (کپی از DiscountBadgeClient)
function checkHasDiscount(product, pricing) {
  if (!product) return false;
  
  const now = new Date();

  // تخفیف دسته
  if (product.category?.discount) {
    const d = product.category.discount;
    const start = d.start_at ? new Date(d.start_at) : null;
    const end = d.end_at ? new Date(d.end_at) : null;

    if (d.is_active !== false) {
      if (!start && !end) return true;
      if (start && now < start) return false;
      if ((!start || now >= start) && (!end || now <= end)) return true;
    }
  }

  // تخفیف روی مواد
  if (!pricing) return false;

  return Object.values(pricing).some(tab =>
    tab?.materialPrices?.some(m => m.has_discount)
  );
}

export default function Landing() {
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState(null);
  
  // ذخیره pricing همه محصولات
  const [productsPricing, setProductsPricing] = useState({});
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true); // ✅ اضافه شد

  // ✅ دریافت دسته‌ها - فقط یکی باشه
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const data = await clientApi.getCategories(); // ✅ درست
        setCategories(data);
        if (data.length > 0) {
          setActiveCategory(data[0]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // ❌ این useEffect رو کلاً حذف کن (duplicate بود):
  // useEffect(() => {
  //   async function loadCategories() {
  //     const data = await api.getCategories(); // ← undefined api
  //     ...
  //   }
  //   loadCategories();
  // }, []);

  // ✅ دریافت محصولات - اصلاح شد
  useEffect(() => {
    async function loadAllData() {
      setIsLoadingProducts(true); // ✅ اضافه شد
      try {
        // اول محصولات رو بگیر
        const products = await clientApi.getProducts(); // ✅ api → clientApi
        setAllProducts(products);

        // بعد pricing همه رو موازی بگیر
        const pricingPromises = products.map(async (product) => {
          try {
            const res = await clientApi.getProduct(product.id); // ✅ api → clientApi
            return { id: product.id, pricing: res.pricing };
          } catch (err) {
            console.error(`Error loading pricing for ${product.id}:`, err);
            return { id: product.id, pricing: null };
          }
        });

        const pricingResults = await Promise.all(pricingPromises);
        
        const pricingMap = {};
        pricingResults.forEach(({ id, pricing }) => {
          pricingMap[id] = pricing;
        });
        
        setProductsPricing(pricingMap);
        setPricingLoaded(true);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoadingProducts(false); // ✅ اضافه شد
      }
    }

    loadAllData();
  }, []);

  // محاسبه دسته‌بندی‌های ۱۰۰٪ تخفیف‌دار (با دیتای واقعی pricing)
  const fullyDiscountedCategories = useMemo(() => {
    if (!pricingLoaded || allProducts.length === 0) return [];

    return categories
      .filter((cat) => {
        const catProducts = allProducts.filter((p) => p.category.id === cat.id);
        if (catProducts.length === 0) return false;

        // چک کن همه محصولات این دسته تخفیف دارن
        return catProducts.every((product) => {
          const pricing = productsPricing[product.id];
          return checkHasDiscount(product, pricing);
        });
      })
      .map((cat) => cat.id);
  }, [categories, allProducts, productsPricing, pricingLoaded]);

  // محصولات دسته فعال
  const filteredByCategory = useMemo(() => {
    if (!activeCategory) return [];
    return allProducts.filter((p) => p.category.id === activeCategory.id);
  }, [activeCategory, allProducts]);

  // سرچ محصولات
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const normalize = (text) =>
      text
        .toLowerCase()
        .replace(/[اآ]/g, "ا")
        .replace(/[يی]/g, "ی")
        .trim();

    const q = normalize(searchQuery);

    return allProducts.filter((item) =>
      normalize(item.title).includes(q)
    );
  }, [searchQuery, allProducts]);

  const handleSelectSuggestion = (product) => {
    setSearchQuery(product.title);
    setSelectedCard(product);
    setActiveCategory(product.category);
  };

  return (
    <div dir="rtl" className="min-h-dvh w-full text-gray-900 dark:text-gray-100 md:pt-15.5">
      {/* هدر */}
      <section className="p-8 text-center">
        <h1 className="text-3xl font-bold">خشکشویی افشار</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-200">
          خدمات خشکشویی، شستشو، اتو و لکه‌بری
        </p>
      </section>

      {/* سرچ */}
      <div className="px-4 mt-4 flex justify-center">
        <div className="w-full md:w-2/3 lg:w-1/2">
          <span className="flex mr-2 my-1">چی میخوای پیدا کنی؟</span>

          <Search
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              if (!val.trim()) setSelectedCard(null);
            }}
            items={searchQuery.trim() ? filteredBySearch.slice(0, 6) : []}
            onSelect={handleSelectSuggestion}
            placeholder="پتو، کت، مانتو ..."
            renderItem={(item) => (
              <div className="flex justify-between text-sm">
                <span>{item.title}</span>
                <span className="text-xs text-gray-400 dark:text-gray-100">
                  {item.category.name}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      {/* تب دسته‌ها */}
      <div className="mt-4 px-4 py-3 overflow-x-auto">
        <CategoryTabs
          categories={categories}
          active={activeCategory}
          onCategoryChange={(c) => {
            setActiveCategory(c);
            setSelectedCard(null);
            setSearchQuery("");
          }}
          fullyDiscountedCategories={fullyDiscountedCategories}
          isLoading={isLoadingCategories}  
        />
      </div>


      {/* کارت‌ها - با pricing از قبل لود شده */}
      <section className="p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 mb-16">
          {selectedCard ? (
            <Card 
              {...selectedCard} 
              preloadedPricing={productsPricing[selectedCard.id]}
            />
          ) : (
            filteredByCategory.map((p) => (
              <Card 
                key={p.id} 
                {...p} 
                preloadedPricing={productsPricing[p.id]}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
