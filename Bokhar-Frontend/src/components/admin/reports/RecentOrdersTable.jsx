import React from 'react';

export default function RecentOrdersTable({ orders }) {
  return (
    <table className="min-w-full border border-slate-200 dark:border-gray-600 text-sm">
      <thead className="bg-slate-100 dark:bg-[#2d3350]">
        <tr>
          <th className="p-2 text-left text-gray-900 dark:text-gray-200">کد سفارش</th>
          <th className="p-2 text-left text-gray-900 dark:text-gray-200">مشتری</th>
          <th className="p-2 text-left text-gray-900 dark:text-gray-200">مبلغ</th>
          <th className="p-2 text-left text-gray-900 dark:text-gray-200">وضعیت</th>
          <th className="p-2 text-left text-gray-900 dark:text-gray-200">تاریخ</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <tr key={order.id} className="border-t border-slate-200 dark:border-gray-600 dark:text-gray-200">
            <td className="p-2">{order.id}</td>
            <td className="p-2">{order.customer_name || order.customer_id}</td>
            <td className="p-2">{order.total_amount} تومان</td>
            <td className="p-2">{order.status}</td>
            <td className="p-2">{new Date(order.created_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}