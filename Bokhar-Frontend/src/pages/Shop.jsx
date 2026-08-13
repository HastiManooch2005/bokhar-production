import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import CategoryTabs from "../components/CategoryTabs";
import Card from "../components/Card";
import Search from "../components/Search";
import clientApi from "../api/clientApi";

function checkHasDiscount(product, pricing) {
  if (!product) return false;
  const now = new Date();

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
  
  const [productsPricing, setProductsPricing] = useState({});
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // ========== کش لوکال استوریج برای دیتای اصلی ==========
  useEffect(() => {
    const cachedCats = localStorage.getItem('categories_cache');
    const cachedProds = localStorage.getItem('products_cache');
    
    if (cachedCats) {
      try {
        const { data, time } = JSON.parse(cachedCats);
        if (Date.now() - time < 30 * 60 * 1000) {
          setCategories(data);
          setActiveCategory(data[0] || null);
          setIsLoadingCategories(false);
        }
      } catch(e) {}
    }
    
    if (cachedProds) {
      try {
        const { data, time } = JSON.parse(cachedProds);
        if (Date.now() - time < 30 * 60 * 1000) {
          setAllProducts(data);
          setIsLoadingProducts(false);
        }
      } catch(e) {}
    }
  }, []);

  // دریافت دسته‌ها
  useEffect(() => {
    if (categories.length > 0) return; // اگه از کش اومده، دوباره نگیر
    
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const data = await clientApi.getCategories();
        setCategories(data);
        if (data.length > 0 && !activeCategory) {
          setActiveCategory(data[0]);
        }
        localStorage.setItem('categories_cache', JSON.stringify({
          data, time: Date.now()
        }));
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [categories.length, activeCategory]);

  // دریافت محصولات
  useEffect(() => {
    if (allProducts.length > 0) return; // اگه از کش اومده، دوباره نگیر

    async function loadAllData() {
      setIsLoadingProducts(true);
      try {
        const products = await clientApi.getProducts();
        setAllProducts(products);
        localStorage.setItem('products_cache', JSON.stringify({
          data: products, time: Date.now()
        }));
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    loadAllData();
  }, [allProducts.length]);

  // ========== LAZY LOADING: فقط pricing دسته فعال ==========
  const pricingLoadedRef = useRef(new Set());

  useEffect(() => {
    if (!activeCategory || !allProducts.length) return;

    const categoryProducts = allProducts.filter(
      (p) => p.category.id === activeCategory.id
    );
    
    const missing = categoryProducts.filter(
      (p) => !pricingLoadedRef.current.has(p.id)
    );

    if (missing.length === 0) {
      setPricingLoaded(true);
      return;
    }

    setPricingLoaded(false);

    const loadPricing = async () => {
      const promises = missing.map(async (product) => {
        try {
          const res = await clientApi.getProduct(product.id);
          pricingLoadedRef.current.add(product.id);
          return { id: product.id, pricing: res.pricing };
        } catch (err) {
          console.error(`Error loading pricing for ${product.id}:`, err);
          return { id: product.id, pricing: null };
        }
      });

      const results = await Promise.all(promises);
      
      setProductsPricing(prev => {
        const next = { ...prev };
        results.forEach(({ id, pricing }) => {
          next[id] = pricing;
        });
        return next;
      });
      
      setPricingLoaded(true);
    };

    loadPricing();
  }, [activeCategory, allProducts]);

  // دسته‌بندی‌های ۱۰۰٪ تخفیف‌دار
  const fullyDiscountedCategories = useMemo(() => {
    if (!pricingLoaded || allProducts.length === 0) return [];

    return categories
      .filter((cat) => {
        const catProducts = allProducts.filter((p) => p.category.id === cat.id);
        if (catProducts.length === 0) return false;

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

  // سرچ
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

  const handleSelectSuggestion = useCallback((product) => {
    setSearchQuery(product.title);
    setSelectedCard(product);
    setActiveCategory(product.category);
  }, []);

  const handleCategoryChange = useCallback((cat) => {
    setActiveCategory(cat);
    setSelectedCard(null);
    setSearchQuery("");
  }, []);

  return (
    <div dir="rtl" className="min-h-dvh w-full text-gray-900 dark:text-gray-100 md:pt-15.5">
      <section className="p-8 text-center">
        <h1 className="text-3xl font-bold">خشکشویی افشار</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-200">
          خدمات خشکشویی، شستشو، اتو و لکه‌بری
        </p>
      </section>

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

      <div className="mt-4 px-4 py-3 overflow-x-auto">
        <CategoryTabs
          categories={categories}
          active={activeCategory}
          onCategoryChange={handleCategoryChange}
          fullyDiscountedCategories={fullyDiscountedCategories}
          isLoading={isLoadingCategories}  
        />
      </div>

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