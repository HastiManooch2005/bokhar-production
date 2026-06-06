import React from "react";
import Card from "../Card";

export const sportsData = [
  {
    id: 1,
    title: "ست ورزشی",
    image: "/images/sports.png",
    basePrice: 35000,
    category: "ورزشی",
    options: [
      { key: "wash", label: "شستشو", price: 10000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 15000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 8000, type: "checkbox" },
      { key: "sanitize", label: "ضدعفونی", price: 5000, type: "checkbox" },
    ],
  },
  {
    id: 2,
    title: "کاپشن اسکی",
    image: "/images/ski-jacket.png",
    basePrice: 70000,
    category: "ورزشی",
    options: [
      { key: "wash", label: "شستشو تخصصی", price: 20000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 30000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 10000, type: "checkbox" },
      { key: "repair", label: "ترمیم پارچه", price: 15000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "S", label: "S", price: 0 },
          { value: "M", label: "M", price: 0 },
          { value: "L", label: "L", price: 0 },
          { value: "XL", label: "XL", price: 0 },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "شلوار اسکی",
    image: "/images/ski-pants.png",
    basePrice: 50000,
    category: "ورزشی",
    options: [
      { key: "wash", label: "شستشو تخصصی", price: 15000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 25000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 8000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "S", label: "S", price: 0 },
          { value: "M", label: "M", price: 0 },
          { value: "L", label: "L", price: 0 },
        ],
      },
    ],
  },
  {
    id: 4,
    title: "دستکش بوکس",
    image: "/images/boxing-gloves.png",
    basePrice: 30000,
    category: "ورزشی",
    options: [
      { key: "wash", label: "شستشو", price: 8000, type: "checkbox" },
      { key: "sanitize", label: "ضدعفونی", price: 5000, type: "checkbox" },
    ],
  },
  {
    id: 5,
    title: "دستکش دروازبانی",
    image: "/images/goalkeeper-gloves.png",
    basePrice: 25000,
    category: "ورزشی",
    options: [
      { key: "wash", label: "شستشو", price: 7000, type: "checkbox" },
      { key: "sanitize", label: "ضدعفونی", price: 4000, type: "checkbox" },
    ],
  },
  {
    id: 6,
    title: "کیسه خواب",
    image: "/images/sleeping-bag.png",
    basePrice: 40000,
    category: "ورزشی",
    options: [
      { key: "wash", label: "شستشو کامل", price: 15000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 20000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 7000, type: "checkbox" },
      { key: "sanitize", label: "ضدعفونی", price: 5000, type: "checkbox" },
    ],
  },
  {
    id: 7,
    title: "مایو",
    image: "/images/swimsuit.png",
    basePrice: 20000,
    category: "ورزشی",
    options: [
      { key: "wash", label: "شستشو ملایم", price: 5000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 10000, type: "checkbox" },
      { key: "stain", label: "لکه‌گیری", price: 3000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "S", label: "S", price: 0 },
          { value: "M", label: "M", price: 0 },
          { value: "L", label: "L", price: 0 },
        ],
      },
    ],
  },
];

export default function Sports() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {sportsData.map((item) => (
        <Card key={item.id} {...item} />
      ))}
    </div>
  );
}
