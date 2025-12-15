import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import data from '../../data/dashboardData.json';

const StakeholderOwnershipWidget = () => {
    const { stakeholderOwnership } = data;

    // Custom legend data mapping - mimicking the "pills" look below the chart
    // The attachment shows 4 pills: Open, Decisions this Sprint, Overdue, Closed this week.
    // I will render them explicitly below the chart.

    return (
        <div className="bg-[#eef6f6] rounded-2xl p-4 shadow-sm h-full flex flex-col items-center">
            <h2 className="text-lg font-bold text-slate-800 mb-1 leading-tight text-center w-full">
                Stakeholder Ownership
            </h2>

            <div className="font-semibold text-slate-600 text-sm mb-4 text-center">
                Total Actions: {stakeholderOwnership.totalActions}
            </div>

            <div className="w-full flex-1 min-h-[150px] relative flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stakeholderOwnership.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius="80%"
                            dataKey="value"
                            stroke="none"
                            label={({ name }) => name.split(' ')[0]} // Simple label on chart for context if needed, or rely on distinct colors
                            labelLine={true}
                        >
                            {stakeholderOwnership.data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="w-full grid grid-cols-2 gap-3 mt-4">
                {stakeholderOwnership.data.map((entry, i) => (
                    <div key={i} className="bg-white rounded-lg py-2 px-3 shadow-sm border border-slate-100 flex flex-col items-start justify-center">
                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full" title={entry.name}>
                            {entry.name}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                            {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StakeholderOwnershipWidget;
