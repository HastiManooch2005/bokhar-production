import Card from "../Card"; // کارت اصلاح‌شده با پارامترهای فاکتور

export const homeAndBedData = [
  {
    id: 1,
    image: "/images/quilt.png",
    title: "لحاف",
    basePrice: 50000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 10000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 15000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "single", label: "تک‌نفره", price: 0 },
          { value: "double", label: "دونفره", price: 10000 },
        ],
      },
    ],
  },
  {
    id: 2,
    image: "/images/blanket.png",
    title: "پتو",
    basePrice: 30000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 8000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 12000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "single", label: "تک‌نفره", price: 0 },
          { value: "double", label: "دونفره", price: 7000 },
        ],
      },
    ],
  },
  {
    id: 3,
    image: "/images/towel.png",
    title: "حوله",
    basePrice: 15000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 5000, type: "checkbox" },
      {
        key: "type",
        label: "نوع",
        type: "select",
        choices: [
          { value: "hand", label: "دستی", price: 0 },
          { value: "bath", label: "حمام", price: 3000 },
          { value: "robe", label: "تن‌پوش", price: 6000 },
        ],
      },
    ],
  },
  {
    id: 4,
    image: "/images/cover.png",
    title: "روفرشی",
    basePrice: 20000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 7000, type: "checkbox" },
      { key: "iron", label: "اتو", price: 3000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "small", label: "کوچک", price: 0 },
          { value: "medium", label: "متوسط", price: 3000 },
          { value: "large", label: "بزرگ", price: 5000 },
        ],
      },
    ],
  },
  {
    id: 5,
    image: "/images/pillow.png",
    title: "بالشت",
    basePrice: 25000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 8000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 12000, type: "checkbox" },
      {
        key: "type",
        label: "نوع",
        type: "select",
        choices: [
          { value: "sleep", label: "خواب", price: 0 },
          { value: "decor", label: "دکوری", price: 5000 },
          { value: "neck", label: "گردنی", price: 4000 },
        ],
      },
    ],
  },
  {
    id: 6,
    image: "/images/bed-cover.png",
    title: "روتختی",
    basePrice: 40000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 10000, type: "checkbox" },
      { key: "dry", label: "خشکشویی", price: 15000, type: "checkbox" },
      {
        key: "size",
        label: "سایز",
        type: "select",
        choices: [
          { value: "single", label: "تک‌نفره", price: 0 },
          { value: "double", label: "دونفره", price: 10000 },
        ],
      },
    ],
  },
  {
    id: 7,
    image: "/images/zebra-curtain.png",
    title: "پرده زبرا",
    basePrice: 35000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 10000, type: "checkbox" },
      {
        key: "size",
        label: "ابعاد (متر مربع)",
        type: "select",
        choices: [
          { value: "1x1", label: "۱×۱", price: 0 },
          { value: "2x2", label: "۲×۲", price: 15000 },
          { value: "3x3", label: "۳×۳", price: 25000 },
        ],
      },
    ],
  },
  {
    id: 8,
    image: "/images/cushion.png",
    title: "کوسن",
    basePrice: 15000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 5000, type: "checkbox" },
      { key: "iron", label: "اتو", price: 2000, type: "checkbox" },
    ],
  },
  {
    id: 9,
    image: "/images/tablecloth.png",
    title: "سفره",
    basePrice: 12000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 5000, type: "checkbox" },
      {
        key: "material",
        label: "جنس",
        type: "select",
        choices: [
          { value: "plastic", label: "پلاستیکی", price: 0 },
          { value: "fabric", label: "پارچه‌ای", price: 3000 },
        ],
      },
    ],
  },
  {
    id: 10,
    image: "/images/sofa-cover.png",
    title: "رو مبلی",
    basePrice: 30000,
    category: "خانه و خواب",
    options: [
      { key: "wash", label: "شستشو", price: 8000, type: "checkbox" },
      { key: "iron", label: "اتو", price: 3000, type: "checkbox" },
      {
        key: "material",
        label: "جنس پارچه",
        type: "select",
        choices: [
          { value: "velvet", label: "مخملی", price: 3000 },
          { value: "fabric", label: "پارچه‌ای", price: 0 },
        ],
      },
    ],
  },
];

export default function HomeAndBed() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {homeAndBedData.map((item) => (
        <Card
          key={item.id}
          {...item}
          qty={1} // تعداد پیش‌فرض
        />
      ))}
    </div>
  );
}
