import React from 'react';
import { Home, Sparkles, MessageSquare, HelpCircle, Headphones } from 'lucide-react';
import data from '../../data/dashboardData.json';

const iconMap = {
    Home: Home,
    Generator: Sparkles,
    "Chat Agent": MessageSquare,
    FAQ: HelpCircle,
    Support: Headphones
};

const Sidebar = ({ isOpen, onClose, onNavigate, activeView }) => {
    const { sidebar } = data;

    const isItemActive = (label) => {
        if (label === 'Home') return activeView === 'dashboard';
        if (label === 'Chat Agent') return activeView === 'chat-agent';
        return false;
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-56 bg-slate-800 text-white flex flex-col py-6 
        rounded-r-3xl md:rounded-r-3xl md:h-full shadow-lg
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
                <div className="flex-1 flex flex-col gap-2 pt-16 md:pt-0"> {/* Padding top for mobile close button area if needed, or just layout */}
                    <div className="md:hidden px-6 mb-4">
                        <h2 className="text-xl font-bold">Menu</h2>
                    </div>

                    {sidebar.filter(item => !item.bottom).map((item) => {
                        const Icon = iconMap[item.label] || Home;
                        const isActive = isItemActive(item.label);
                        return (
                            <div
                                key={item.id}
                                onClick={() => onNavigate && onNavigate(item.label)}
                                className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors relative
                  ${isActive
                                        ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/0 text-teal-400'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                            >
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-lg" />}
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-auto flex flex-col gap-2">
                    {sidebar.filter(item => item.bottom).map((item) => {
                        const Icon = iconMap[item.label] || HelpCircle;
                        return (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 cursor-pointer transition-colors"
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </div>
                        );
                    })}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
