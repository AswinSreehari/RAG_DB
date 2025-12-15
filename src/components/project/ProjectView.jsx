
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import MeetingSection from './MeetingSection';
import StakeholderSection from './StakeholderSection';
import AISuggestionsSection from './AISuggestionsSection';

const ProjectView = ({ project, onBack }) => {
    return (
        <div className="flex flex-col gap-4 h-full pb-2 overflow-hidden">
            {/* Header Strip */}
            <div className="bg-[#eef6f6] rounded-xl px-4 py-3 shadow-sm flex items-center shrink-0 gap-4">
                <button
                    onClick={onBack}
                    className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center">
                    <span className="font-bold text-slate-600 mr-2">Project Name :</span>
                    <span className="font-bold text-slate-800 text-lg">{project.title}</span>
                </div>
            </div>

            {/* 3-Column Content */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto lg:overflow-hidden">
                <div className="h-full min-h-[500px]">
                    <MeetingSection />
                </div>
                <div className="h-full min-h-[500px]">
                    <StakeholderSection />
                </div>
                <div className="h-full min-h-[500px]">
                    <AISuggestionsSection />
                </div>
            </div>
        </div>
    );
};

export default ProjectView;
