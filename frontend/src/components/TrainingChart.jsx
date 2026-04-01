import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function TrainingChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px'
            }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend iconType="circle" />
          <Line 
            type="monotone" 
            dataKey="accuracy" 
            stroke="#6366f1" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#6366f1' }}
            activeDot={{ r: 6 }}
            name="Accuracy (%)"
          />
          <Line 
            type="monotone" 
            dataKey="loss" 
            stroke="#ec4899" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#ec4899' }}
            activeDot={{ r: 6 }}
            name="Loss"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
