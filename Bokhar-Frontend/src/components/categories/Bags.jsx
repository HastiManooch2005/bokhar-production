import Card from "../Card"; // کارت اصلاح‌شده که پارامترهای فاکتور رو می‌فرسته

export const bagsData = [
  {
    id: 1,
    image: "/images/shoes.png",
    title: "کفش",
    basePrice: 25000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 10000, type: "checkbox" },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "leather", label: "چرم", price: 5000 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "36", label: "36", price: 0 },
          { value: "37", label: "37", price: 0 },
          { value: "38", label: "38", price: 0 },
        ],
      },
    ],
  },
  {
    id: 2,
    image: "/images/sneakers.png",
    title: "کتونی",
    basePrice: 28000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 10000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "36-40", label: "36-40", price: 0 },
          { value: "41-44", label: "41-44", price: 5000 },
        ],
      },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "leather", label: "چرم", price: 5000 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
    ],
  },
  {
    id: 3,
    image: "/images/bag.png",
    title: "کیف",
    basePrice: 20000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 5000, type: "checkbox" },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "leather", label: "چرم", price: 5000 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "small", label: "کوچک", price: 0 },
          { value: "medium", label: "متوسط", price: 0 },
          { value: "large", label: "بزرگ", price: 0 },
        ],
      },
    ],
  },
  {
    id: 4,
    image: "/images/backpack.png",
    title: "کوله پشتی",
    basePrice: 30000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 12000, type: "checkbox" },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "nylon", label: "نایلون", price: 0 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "small", label: "کوچک", price: 0 },
          { value: "medium", label: "متوسط", price: 0 },
          { value: "large", label: "بزرگ", price: 0 },
        ],
      },
    ],
  },
  {
    id: 5,
    image: "/images/boots.png",
    title: "بوت",
    basePrice: 35000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 10000, type: "checkbox" },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "leather", label: "چرم", price: 5000 },
          { value: "synthetic", label: "مصنوعی", price: 0 },
        ],
      },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "36-40", label: "36-40", price: 0 },
          { value: "41-44", label: "41-44", price: 5000 },
        ],
      },
    ],
  },
  {
    id: 6,
    image: "/images/wallet.png",
    title: "کیف پول",
    basePrice: 15000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 3000, type: "checkbox" },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "leather", label: "چرم", price: 3000 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
    ],
  },
  {
    id: 7,
    image: "/images/women-bag.png",
    title: "کیف زنانه",
    basePrice: 25000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 7000, type: "checkbox" },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "leather", label: "چرم", price: 5000 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "small", label: "کوچک", price: 0 },
          { value: "medium", label: "متوسط", price: 0 },
          { value: "large", label: "بزرگ", price: 0 },
        ],
      },
    ],
  },
  {
    id: 8,
    image: "/images/sandal.png",
    title: "صندل",
    basePrice: 22000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 8000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "36-40", label: "36-40", price: 0 },
          { value: "41-44", label: "41-44", price: 5000 },
        ],
      },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "leather", label: "چرم", price: 5000 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
    ],
  },
  {
    id: 9,
    image: "/images/travel-bag.png",
    title: "ساک",
    basePrice: 30000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 15000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "small", label: "کوچک", price: 0 },
          { value: "medium", label: "متوسط", price: 0 },
          { value: "large", label: "بزرگ", price: 0 },
        ],
      },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "nylon", label: "نایلون", price: 0 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
    ],
  },
  {
    id: 10,
    image: "/images/suitcase.png",
    title: "چمدان",
    basePrice: 50000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 10000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "small", label: "کوچک", price: 0 },
          { value: "medium", label: "متوسط", price: 0 },
          { value: "large", label: "بزرگ", price: 0 },
        ],
      },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "plastic", label: "پلاستیک", price: 0 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
    ],
  },
  {
    id: 11,
    image: "/images/long-boots.png",
    title: "چکمه",
    basePrice: 40000,
    category: "کفش و کیف",
    options: [
      { key: "wash", label: "شستشو", price: 12000, type: "checkbox" },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "leather", label: "چرم", price: 5000 },
          { value: "synthetic", label: "مصنوعی", price: 0 },
        ],
      },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "36-40", label: "36-40", price: 0 },
          { value: "41-44", label: "41-44", price: 5000 },
        ],
      },
    ],
  },
];

export default function Bags() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {bagsData.map((item) => (
        <Card
          key={item.id}
          {...item}
          qty={1} // تعداد پیش‌فرض 1
        />
      ))}
    </div>
  );
}
