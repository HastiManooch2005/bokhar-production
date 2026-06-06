import React from "react";
import Card from "../Card";

export const shirtsPantsData = [
  {
    id: 1,
    title: "تیشرت",
    image: "/images/zirpirhan.jpg",
    basePrice: 20000,
    category: "پیراهن",
    options: [
      { key: "iron", label: "اتو", price: 5000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 10000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "S", label: "S", price: 0 },
          { value: "M", label: "M", price: 5000 },
          { value: "L", label: "L", price: 10000 },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "بلوز آستین بلند",
    image: "/images/overcoat.jpg",
    basePrice: 25000,
    category: "پیراهن",
    options: [
      { key: "iron", label: "اتو", price: 5000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 10000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "S", label: "S", price: 0 },
          { value: "M", label: "M", price: 5000 },
          { value: "L", label: "L", price: 10000 },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "شومیز",
    image: "/images/pants.png",
    basePrice: 30000,
    category: "پیراهن",
    options: [
      { key: "iron", label: "اتو", price: 5000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 10000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "S", label: "S", price: 0 },
          { value: "M", label: "M", price: 5000 },
          { value: "L", label: "L", price: 10000 },
        ],
      },
    ],
  },
  {
    id: 4,
    title: "پیراهن",
    image: "/images/jelighe.jpg",
    basePrice: 30000,
    category: "پیراهن",
    options: [
      { key: "iron", label: "اتو", price: 5000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 10000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "S", label: "S", price: 0 },
          { value: "M", label: "M", price: 5000 },
          { value: "L", label: "L", price: 10000 },
        ],
      },
    ],
  },
];

// 🔹 کامپوننت اصلی برای نمایش کارت‌ها
export default function Shirts() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {shirtsPantsData.map((card) => (
        <Card key={card.id} {...card} />
      ))}
    </div>
  );
}
