import React from 'react';


export default function RecentOrdersTable({ orders }) {
return (
<table className="min-w-full border border-slate-200 text-sm">
<thead className="bg-slate-100">
<tr>
<th className="p-2 text-left">کد سفارش</th>
<th className="p-2 text-left">مشتری</th>
<th className="p-2 text-left">مبلغ</th>
<th className="p-2 text-left">وضعیت</th>
<th className="p-2 text-left">تاریخ</th>
</tr>
</thead>
<tbody>
{orders.map(order => (
<tr key={order.id} className="border-t border-slate-200">
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