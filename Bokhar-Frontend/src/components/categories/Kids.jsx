import Card from "../Card";

export const kidsData = [
  {
    id: 1,
    image: "/images/doll.png",
    title: "عروسک",
    basePrice: 15000,
    category: "بچگانه",
    options: [
      { key: "wash", label: "شستشو", type: "checkbox", price: 8000 },
      { key: "repair", label: "ترمیم", type: "checkbox", price: 12000 },
    ],
  },
  {
    id: 2,
    image: "/images/mattress.png",
    title: "تشک بچه",
    basePrice: 40000,
    category: "بچگانه",
    options: [
      { key: "deepwash", label: "شستشو عمیق", type: "checkbox", price: 20000 },
      { key: "dryclean", label: "خشکشویی", type: "checkbox", price: 15000 },
    ],
  },
  {
    id: 3,
    image: "/images/stroller.png",
    title: "کالسکه",
    basePrice: 60000,
    category: "بچگانه",
    options: [
      { key: "fullwash", label: "شستشو کامل", type: "checkbox", price: 25000 },
      { key: "sanitize", label: "ضدعفونی", type: "checkbox", price: 15000 },
    ],
  },
  {
    id: 4,
    image: "/images/carrier.png",
    title: "کریر",
    basePrice: 35000,
    category: "بچگانه",
    options: [
      { key: "wash", label: "شستشو", type: "checkbox", price: 10000 },
      { key: "dryclean", label: "خشکشویی", type: "checkbox", price: 12000 },
    ],
  },
  {
    id: 5,
    image: "/images/kids-clothes.png",
    title: "لباس بچگانه",
    basePrice: 20000,
    category: "بچگانه",
    options: [
      { key: "wash", label: "شستشو", type: "checkbox", price: 8000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 5000 },
      {
        key: "material",
        label: "جنس پارچه",
        type: "select",
        choices: [
          { value: "cotton", label: "نخی", price: 0 },
          { value: "wool", label: "پشمی", price: 5000 },
        ],
      },
    ],
  },
  {
    id: 6,
    image: "/images/cradle.png",
    title: "گهواره",
    basePrice: 50000,
    category: "بچگانه",
    options: [
      { key: "clean", label: "تمیزکاری کامل", type: "checkbox", price: 20000 },
      { key: "sanitize", label: "ضدعفونی", type: "checkbox", price: 15000 },
    ],
  },
  {
    id: 7,
    image: "/images/kids-jacket.png",
    title: "کاپشن بچگانه",
    basePrice: 30000,
    category: "بچگانه",
    options: [
      { key: "wash", label: "شستشو", type: "checkbox", price: 10000 },
      { key: "dryclean", label: "خشکشویی", type: "checkbox", price: 15000 },
      { key: "iron", label: "اتو", type: "checkbox", price: 5000 },
    ],
  },
  {
    id: 8,
    image: "/images/kids-chair.png",
    title: "صندلی بچه",
    basePrice: 45000,
    category: "بچگانه",
    options: [
      { key: "wash", label: "شستشو کامل", type: "checkbox", price: 20000 },
      { key: "sanitize", label: "ضدعفونی", type: "checkbox", price: 15000 },
    ],
  },
];

export default function Kids() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {kidsData.map((item) => (
        <Card key={item.id} {...item} qty={1} />
      ))}
    </div>
  );
}
