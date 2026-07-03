import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function RevenueChart({ data, xKey }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
      >
        <XAxis 
          dataKey={xKey} 
          tick={{ fill: '#94a3b8' }}
          axisLine={{ stroke: '#475569' }}
          tickLine={{ stroke: '#475569' }}
        />
        <YAxis 
          tick={{ fill: '#94a3b8' }}
          axisLine={{ stroke: '#475569' }}
          tickLine={{ stroke: '#475569' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#262B40', 
            border: '1px solid #4b5563',
            borderRadius: '8px',
            color: '#e5e7eb'
          }}
          itemStyle={{ color: '#e5e7eb' }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#8AA1C4"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}