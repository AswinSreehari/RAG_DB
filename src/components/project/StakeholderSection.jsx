import React from 'react';
import data from '../../data/dashboardData.json';

const StakeholderSection = () => {
    const { stakeholders, reviewComments, escalations } = data.projectDetailsView;

    return (
        <div className="bg-[#eef6f6] rounded-2xl p-5 shadow-sm h-full flex flex-col overflow-hidden">
            <h3 className="font-bold text-slate-800 mb-4 text-base">Stakeholder Communication</h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-6">
                {/* Key Stakeholders */}
                <div>
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">Key Stakeholders</h4>
                    <div className="space-y-2">
                        {stakeholders.map((person, idx) => (
                            <div key={idx} className="bg-white p-2 px-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                                <span className="text-sm font-semibold text-slate-700">{person.name}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Status: {person.status}</span>
                                    <span className={`w-2 h-2 rounded-full ${person.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Review Comments */}
                <div>
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">Review Comments</h4>
                    <div className="space-y-3">
                        {reviewComments.map((comment, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <p className="text-sm font-bold text-slate-800 mb-1">{comment.text}</p>
                                <div className="text-xs text-slate-500 mb-2">{comment.context}</div>
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-1">
                                        <span className="text-slate-600">Severity:</span>
                                        <span style={{ color: comment.severityColor }} className="font-bold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: comment.severityColor }}></span>
                                            {comment.severity}
                                        </span>
                                    </div>
                                    <span className="text-slate-600">Status: <span className="font-medium text-slate-800">{comment.status}</span></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Escalations */}
                <div>
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">Escalations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {escalations.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
                                <h5 className="font-bold text-xs text-slate-800 mb-2 leading-tight">{item.title}</h5>
                                <div className="text-[11px] text-slate-600 space-y-1 flex-1">
                                    <div><span className="font-semibold">Escalated by:</span> {item.escalatedBy}</div>
                                    <div><span className="font-semibold">To:</span> {item.to}</div>
                                    <div><span className="font-semibold">Reason:</span> {item.reason}</div>
                                </div>
                                <div className="mt-2 text-[11px] font-bold flex items-center gap-1" style={{ color: item.urgencyColor }}>
                                    <span className="w-3 h-3 rounded-full border flex items-center justify-center text-[8px]" style={{ borderColor: item.urgencyColor }}>!</span>
                                    Urgency: {item.urgency}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StakeholderSection;
