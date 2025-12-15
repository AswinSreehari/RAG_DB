import React from 'react';
import data from '../../data/dashboardData.json';

const DocumentGeneratorWidget = () => {
    const { documentGenerator } = data;

    return (
        <div className="bg-[#eef6f6] rounded-2xl p-6 shadow-sm h-full flex flex-col justify-center">
            <h2 className="text-lg font-bold text-slate-800 mb-1">{documentGenerator.title}</h2>
            <p className="text-xs text-slate-500 mb-6">{documentGenerator.subtitle}</p>

            <div className="grid grid-cols-2 gap-4">
                {documentGenerator.options.map((option, index) => (
                    <button
                        key={index}
                        className="bg-[#e2ebeb] hover:bg-teal-100/50 hover:border-teal-500/30 border border-transparent 
              text-slate-700 font-semibold py-4 rounded-xl transition-all shadow-sm hover:shadow-md text-sm"
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DocumentGeneratorWidget;
