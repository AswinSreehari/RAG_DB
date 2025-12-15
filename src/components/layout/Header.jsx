import React from 'react';
import { Bell, Settings, User, Menu } from 'lucide-react';
import data from '../../data/dashboardData.json';

const Header = ({ onMenuClick }) => {
    const { app } = data;

    return (
        <header className="flex justify-between items-center px-4 md:px-8 py-4 bg-[#e6f2f2] shrink-0">
            <div className="flex items-center gap-4">
                <button
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors md:hidden text-slate-700"
                    onClick={onMenuClick}
                >
                    <Menu size={24} />
                </button>
                <h1 className="text-xl md:text-2xl text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                    <span className="font-normal">Welcome to the </span>
                    <span className="font-bold">Web Platform!</span>
                </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-4 text-slate-700 shrink-0">
                <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <Bell size={20} />
                </button>
                <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <Settings size={20} />
                </button>
                <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <User size={20} />
                </button>
            </div>
        </header>
    );
};

export default Header;
