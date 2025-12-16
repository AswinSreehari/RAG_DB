import React, { useState, useEffect } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { getProjects } from '../../services/projectService';

const ProjectsWidget = ({ onProjectClick }) => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const sourceUrl = import.meta.env.VITE_DATASOURCE_URL;
    const sourceName = sourceUrl ? sourceUrl.split('github.com/')[1] : 'Configured Source';

    useEffect(() => {
        const loadProjects = async () => {
            setLoading(true);
            const data = await getProjects();
            setProjects(data);
            setLoading(false);
        };

        loadProjects();
    }, []);

    return (
        <div className="bg-[#eef6f6] rounded-2xl p-4 shadow-sm h-[50vh] overflow-hidden flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4 px-1 truncate" title={sourceUrl}>
                Projects ({sourceName})
            </h2>

            {loading ? (
                <div className="flex-1 flex justify-center items-center text-teal-600">
                    <Loader2 size={32} className="animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-auto flex flex-col gap-3 pr-2 custom-scrollbar">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => onProjectClick && onProjectClick(project)}
                            className="rounded-lg p-3 relative group transition-all shrink-0 cursor-pointer
                                       bg-[#e2ebeb] text-slate-800 
                                       hover:bg-teal-500 hover:text-white hover:shadow-md"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-sm leading-tight pr-8 break-words">{project.name}</h3>
                                <Settings size={16} className="absolute top-3 right-3 text-slate-400 group-hover:text-teal-900 group-hover:opacity-70 transition-colors" />
                            </div>

                            <div className="flex justify-between items-end text-[10px] sm:text-[11px] font-medium text-slate-500 group-hover:text-teal-50 transition-colors">
                                <div className="flex gap-3">
                                    <span>No. of Files: {project.fileCount}</span>
                                    <span>No. of Users: {project.users ? project.users.length : 0}</span>
                                </div>
                                <span className="italic opacity-70 group-hover:opacity-90">Last Modified: {project.lastModified}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProjectsWidget;
