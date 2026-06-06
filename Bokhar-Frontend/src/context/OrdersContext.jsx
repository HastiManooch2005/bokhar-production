import { createContext, useState, useContext } from "react";

const OrdersContext = createContext();

export const useOrders = () => useContext(OrdersContext);

export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState([
    {
      id: 1,
      customer: "علی رضایی",
      items: [
        { name: "پیراهن", type: "خشکشویی", price: 20 },
        { name: "شلوار", type: "خشکشویی", price: 15 },
      ],
      total: 35,
      status: "در حال جمع‌آوری",
      pickupDate: "2025-11-27",
      deliveryDate: "2025-11-29",
    },
    {
      id: 2,
      customer: "مریم احمدی",
      items: [{ name: "کت و شلوار", type: "خشکشویی", price: 50 }],
      total: 50,
      status: "در حال شستشو",
      pickupDate: "2025-11-26",
      deliveryDate: "2025-11-28",
    },
  ]);

  const addOrder = (order) => setOrders([...orders, order]);
  const updateOrder = (id, updated) =>
    setOrders(orders.map((o) => (o.id === id ? { ...o, ...updated } : o)));

  return (
    <OrdersContext.Provider value={{ orders, addOrder, updateOrder }}>
      {children}
    </OrdersContext.Provider>
  );
};
