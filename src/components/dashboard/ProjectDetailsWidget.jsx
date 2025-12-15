import React from 'react';
import data from '../../data/dashboardData.json';

const ProjectDetailsWidget = () => {
    const { projectDetails } = data;

    return (
        <div className="bg-[#eef6f6] rounded-2xl p-5 shadow-sm h-full flex flex-col relative">
            <h2 className="text-lg font-bold text-slate-800 mb-6">{projectDetails.title}</h2>

            <div className="bg-[#e2ebeb] rounded-xl p-6 flex-1 mb-12">
                <ul className="space-y-3 text-sm text-slate-600">
                    <li>No. of Files: {projectDetails.stats.files}</li>
                    <li>No. of Users: {projectDetails.stats.users}</li>
                    <li>Last Modified: {projectDetails.stats.lastModified}</li>
                </ul>
            </div>

            <div className="mt-auto flex justify-center w-full">
                <button className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-8 py-2 rounded-lg shadow-md transition-colors">
                    {projectDetails.cta}
                </button>
            </div>
        </div>
    );
};

export default ProjectDetailsWidget;
