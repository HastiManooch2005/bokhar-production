import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function RevenueChart({ data, xKey }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: -20, bottom: 5 }}  
      >
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
