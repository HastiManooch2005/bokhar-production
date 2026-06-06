import React from "react";
import Card from "../Card";

// 🔹 داده‌ها جدا و export شده تا Landing.jsx بتونه استفاده کنه
export const othersData = [
  {
    id: 2,
    title: "جوراب",
    image: "/images/robe.png",
    basePrice: 20000,
    category: "سایر",
    options: [
      { key: "wash", label: "شستشو", price: 7000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 10000, type: "checkbox" },
    ],
    dropdowns: {
      material: ["نخی", "پشمی", "ابریشمی"],
      size: ["کوچک", "متوسط", "بزرگ"],
      color: ["سفید", "مشکی", "رنگی"],
    },
  },
  {
    id: 3,
    title: "پیشبند",
    image: "/images/apron.png",
    basePrice: 10000,
    category: "سایر",
    options: [{ key: "wash", label: "شستشو", price: 3000, type: "checkbox" }],
    dropdowns: {
      material: ["کتان", "پلاستیکی", "پارچه‌ای"],
      size: ["کودک", "متوسط", "بزرگسال"],
      color: ["سفید", "آبی", "قرمز"],
    },
  },
  {
    id: 4,
    title: "روپوش",
    image: "/images/coat.png",
    basePrice: 25000,
    category: "سایر",
    options: [
      { key: "wash", label: "شستشو", price: 8000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 12000, type: "checkbox" },
    ],
    dropdowns: {
      material: ["نخی", "پشمی", "پلی‌استر"],
      size: ["S", "M", "L", "XL"],
      color: ["سفید", "آبی", "سبز"],
    },
  },
  {
    id: 5,
    title: "دستکش",
    image: "/images/gloves.png",
    basePrice: 15000,
    category: "سایر",
    options: [{ key: "wash", label: "شستشو", price: 4000, type: "checkbox" }],
    dropdowns: {
      material: ["چرمی", "نخی", "پلاستیکی"],
      size: ["کوچک", "متوسط", "بزرگ"],
      color: ["سفید", "مشکی", "قرمز"],
    },
  },
  {
    id: 6,
    title: "جانماز",
    image: "/images/prayer-mat.png",
    basePrice: 12000,
    category: "سایر",
    options: [
      { key: "wash", label: "شستشو کامل", price: 7000, type: "checkbox" },
    ],
    dropdowns: {
      material: ["مخملی", "پارچه‌ای"],
      size: ["کوچک", "متوسط", "بزرگ"],
      color: ["قهوه‌ای", "سبز", "آبی"],
    },
  },
  {
    id: 7,
    title: "پرچم",
    image: "/images/flag.png",
    basePrice: 10000,
    category: "سایر",
    options: [{ key: "wash", label: "شستشو", price: 3000, type: "checkbox" }],
    dropdowns: {
      material: ["ساتن", "نایلون"],
      size: ["کوچک", "متوسط", "بزرگ"],
      color: ["قرمز", "سفید", "سبز"],
    },
  },
  {
    id: 8,
    title: "کلاه",
    image: "/images/hat.png",
    basePrice: 8000,
    category: "سایر",
    options: [{ key: "wash", label: "شستشو", price: 2000, type: "checkbox" }],
    dropdowns: {
      material: ["نخی", "پشمی"],
      size: ["کوچک", "متوسط", "بزرگ"],
      color: ["مشکی", "خاکستری", "کرم"],
    },
  },
  {
    id: 9,
    title: "سجاده",
    image: "/images/rug.png",
    basePrice: 15000,
    category: "سایر",
    options: [
      { key: "wash", label: "شستشو کامل", price: 5000, type: "checkbox" },
    ],
    dropdowns: {
      material: ["مخملی", "پشمی", "نخی"],
      size: ["کوچک", "متوسط", "بزرگ"],
      color: ["آبی", "سبز", "قهوه‌ای"],
    },
  },
];

// 🔹 نمایش کارت‌ها در دسته سایر
export default function Others({ searchQuery = "" }) {
  const filtered = othersData.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {filtered.map((card) => (
        <Card key={card.id} {...card} />
      ))}
    </div>
  );
}
