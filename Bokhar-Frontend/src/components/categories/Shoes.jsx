import React, { useState } from "react";
import Card from "../Card";

export const shoesData = [
  {
    id: 1,
    title: "کتونی",
    image: "/images/sneakers.png",
    basePrice: 50000,
    category: "کفش",
    options: [
      { name: "تمیزکاری", price: 10000 },
      { name: "واکس", price: 5000 },
      { name: "لکه‌گیری", price: 8000 },
      { name: "سایز 38", price: 0 },
      { name: "سایز 39", price: 0 },
      { name: "سایز 40", price: 0 },
    ],
  },
  {
    id: 2,
    title: "کیف زنانه",
    image: "/images/women-bag.png",
    basePrice: 50000,
    category: "کیف",
    options: [
      { name: "تمیزکاری", price: 10000 },
      { name: "چرم", price: 10000 },
      { name: "پارچه‌ای", price: 0 },
    ],
  },
  {
    id: 3,
    title: "بوت",
    image: "/images/boots.png",
    basePrice: 60000,
    category: "کفش",
    options: [
      { name: "تمیزکاری", price: 12000 },
      { name: "واکس", price: 8000 },
      { name: "لکه‌گیری", price: 10000 },
      { name: "سایز 38", price: 0 },
      { name: "سایز 39", price: 0 },
      { name: "سایز 40", price: 0 },
      { name: "سایز 41", price: 0 },
    ],
  },
  {
    id: 4,
    title: "چمدان",
    image: "/images/suitcase.png",
    basePrice: 80000,
    category: "کیف",
    options: [
      { name: "تمیزکاری", price: 15000 },
      { name: "بسته‌بندی سفر", price: 5000 },
    ],
  },
  {
    id: 5,
    title: "صندل",
    image: "/images/sandal.png",
    basePrice: 35000,
    category: "کفش",
    options: [
      { name: "تمیزکاری", price: 8000 },
      { name: "واکس", price: 4000 },
      { name: "سایز 36", price: 0 },
      { name: "سایز 37", price: 0 },
      { name: "سایز 38", price: 0 },
    ],
  },
];

export default function Shoes() {
  const [cart, setCart] = useState([]);

  const handleAddToCart = (items) => {
    setCart((prev) => [...prev, ...items]);
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {shoesData.map((item) => (
          <Card
            key={item.id}
            {...item}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {/* نمایش سبد خرید ساده */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg w-80 max-h-[50vh] overflow-y-auto">
          <h3 className="font-bold mb-2 text-gray-800 dark:text-gray-100">سبد خرید</h3>
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between text-gray-700 dark:text-gray-200 mb-1">
              <span>{item.name} x{item.qty}</span>
              <span>{item.price.toLocaleString()} تومان</span>
            </div>
          ))}
          <div className="mt-2 font-semibold text-gray-900 dark:text-gray-100">
            مجموع: {cart.reduce((sum, i) => sum + i.price * i.qty, 0).toLocaleString()} تومان
          </div>
        </div>
      )}
    </div>
  );
}
