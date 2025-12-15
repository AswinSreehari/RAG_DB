import React from 'react';
import data from '../../data/dashboardData.json';

const MeetingSection = () => {
    const { meetings, decisions } = data.projectDetailsView;

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Meetings Card */}
            <div className="bg-[#eef6f6] rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-4 text-base">Meeting and Action Items</h3>
                <h4 className="font-semibold text-slate-700 text-sm mb-3">Latest Meetings</h4>

                <div className="flex flex-col gap-3 min-h-0 overflow-auto custom-scrollbar flex-1">
                    {meetings.map((meeting, idx) => (
                        <div key={idx} className="bg-[#e2ebeb] p-3 rounded-xl border border-teal-100/50">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-800 text-sm">{meeting.date}</span>
                                <span className="text-slate-500 text-xs">{meeting.duration}</span>
                            </div>
                            <div className="text-xs text-slate-600 mb-1">{meeting.participants} Participants</div>
                            <div className="text-xs text-slate-600 flex items-center gap-2 mb-2">
                                <span>Transcript:</span>
                                <span className="text-teal-600 font-semibold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                    {meeting.transcriptStatus}
                                </span>
                            </div>
                            <div className="flex gap-4 text-xs font-semibold text-slate-700">
                                <span>Actions Found: {meeting.actions}</span>
                                <span>Decisions Found: {meeting.decisions}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Decisions Card */}
            <div className="bg-[#eef6f6] rounded-2xl p-5 shadow-sm flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-4 text-base">Decisions</h3>

                <div className="flex flex-col gap-3 min-h-0 overflow-auto custom-scrollbar flex-1">
                    {decisions.map((decision, idx) => (
                        <div key={idx} className="bg-[#e2ebeb] p-3 rounded-xl border border-teal-100/50">
                            <h4 className="font-bold text-slate-800 text-sm mb-1">{decision.title}</h4>
                            <div className="text-xs text-slate-600 space-y-0.5">
                                <div>Owner: {decision.owner} | Date: {decision.date}</div>
                                <div>Affects: {decision.affects}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MeetingSection;
