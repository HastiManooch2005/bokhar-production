import Card from "../Card";

export const menData = [
  {
    id: 1,
    image: "/images/vest.png",
    title: "جلیقه",
    basePrice: 20000,
    category: "مردانه",
    options: [
      { key: "wash", label: "شستشو", type: "checkbox", price: 8000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 5000 },
    ],
  },
  {
    id: 3,
    image: "/images/jacket.png",
    title: "کت",
    basePrice: 40000,
    category: "مردانه",
    options: [
      { key: "dryclean", label: "خشکشویی", type: "checkbox", price: 20000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 7000 },
    ],
  },
  {
    id: 4,
    image: "/images/undershirt.png",
    title: "زیر پیراهن",
    basePrice: 15000,
    category: "مردانه",
    options: [
      { key: "wash", label: "شستشو", type: "checkbox", price: 5000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 4000 },
    ],
  },
  {
    id: 5,
    image: "/images/tie.png",
    title: "کراوات",
    basePrice: 10000,
    category: "مردانه",
    options: [
      { key: "wash", label: "شستشو دستی", type: "checkbox", price: 6000 },
    ],
  },
  {
    id: 6,
    image: "/images/pocket-square.png",
    title: "پوشت",
    basePrice: 8000,
    category: "مردانه",
    options: [{ key: "wash", label: "شستشو", type: "checkbox", price: 3000 }],
  },
  {
    id: 7,
    image: "/images/qaba.png",
    title: "قبا",
    basePrice: 45000,
    category: "مردانه",
    options: [
      { key: "dryclean", label: "خشکشویی", type: "checkbox", price: 25000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 8000 },
    ],
  },
  {
    id: 8,
    image: "/images/bowtie.png",
    title: "پاپیون",
    basePrice: 12000,
    category: "مردانه",
    options: [
      { key: "wash", label: "شستشو دستی", type: "checkbox", price: 5000 },
    ],
  },
  {
    id: 9,
    image: "/images/scarf.png",
    title: "دستمال گردن",
    basePrice: 15000,
    category: "مردانه",
    options: [{ key: "wash", label: "شستشو", type: "checkbox", price: 7000 }],
  },
  {
    id: 10,
    image: "/images/work-vest.png",
    title: "جلیقه کار",
    basePrice: 25000,
    category: "مردانه",
    options: [
      { key: "wash", label: "شستشو صنعتی", type: "checkbox", price: 12000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 6000 },
    ],
  },
  {
    id: 11,
    image: "/images/dishdasha.png",
    title: "دشداشه عربی",
    basePrice: 50000,
    category: "مردانه",
    options: [
      { key: "wash", label: "شستشو کامل", type: "checkbox", price: 20000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 10000 },
    ],
  },
  {
    id: 12,
    image: "/images/aba.png",
    title: "عبا",
    basePrice: 60000,
    category: "مردانه",
    options: [
      { key: "dryclean", label: "خشکشویی", type: "checkbox", price: 30000 },
      { key: "sanitize", label: "ضدعفونی", type: "checkbox", price: 15000 },
    ],
  },
  {
    id: 13,
    image: "/images/overall.png",
    title: "لباس کار سرهمی",
    basePrice: 70000,
    category: "مردانه",
    options: [
      { key: "wash", label: "شستشو صنعتی", type: "checkbox", price: 25000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 10000 },
    ],
  },
];

export default function Men() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {menData.map((item) => (
        <Card key={item.id} {...item} qty={1} />
      ))}
    </div>
  );
}
