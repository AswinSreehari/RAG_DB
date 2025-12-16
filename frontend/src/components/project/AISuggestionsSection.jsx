import React from 'react';
import data from '../../data/dashboardData.json';

const AISuggestionsSection = () => {
    const { aiSuggestions } = data.projectDetailsView;

    return (
        <div className="bg-[#eef6f6] rounded-2xl p-5 shadow-sm h-full flex flex-col text-slate-800 overflow-hidden">
            <h3 className="font-bold text-base mb-4">AI Suggestions</h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-5">
                {/* Quality Score */}
                <div className="bg-[#e2ebeb] rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-3">Documentation Quality Score</h4>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="w-12 h-12 rounded-full border-4 border-slate-300 flex items-center justify-center font-bold text-lg bg-white">
                            {aiSuggestions.score}
                        </div>
                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                            Status: {aiSuggestions.status}
                            <span className="w-3 h-3 bg-green-500 rounded-full ml-1"></span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {aiSuggestions.metrics.map((metric, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>{metric.label}</span>
                                    <span>{metric.value}%</span>
                                </div>
                                <div className="w-full bg-slate-300 rounded-full h-1.5">
                                    <div
                                        className="bg-blue-700 h-1.5 rounded-full"
                                        style={{ width: `${metric.value}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Missing NFRs */}
                <div>
                    <h4 className="font-semibold text-sm mb-3">Missing Non-Functional Requirements</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {aiSuggestions.missingNfrs.map((item, idx) => (
                            <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                <div className="font-bold mb-1">{item.title}</div>
                                <div className="flex items-center gap-1 mb-1">
                                    <span className="text-slate-500">Impact:</span>
                                    <span style={{ color: item.impactColor }} className="font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.impactColor }}></span>
                                        {item.impact}
                                    </span>
                                </div>
                                <div className="text-slate-500">Suggested: <span className="italic text-slate-700">{item.suggested}</span></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Recommendations */}
                <div className="bg-[#e2ebeb] rounded-xl p-3 border border-slate-200/50">
                    <h4 className="font-semibold text-sm mb-2">AI Recommendations</h4>
                    <ul className="space-y-2">
                        {aiSuggestions.recommendations.map((rec, idx) => (
                            <li key={idx} className="bg-white p-2 rounded-md text-xs shadow-sm border border-slate-100 text-slate-700">
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AISuggestionsSection;
