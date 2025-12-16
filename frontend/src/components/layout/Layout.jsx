import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col md:flex-row md:h-screen w-full bg-[#d0e8e8] md:overflow-hidden relative min-h-screen">

            {/* Sidebar Area */}
            <div className="md:h-full py-0 md:py-4 pl-0 md:pl-4 pointer-events-none md:pointer-events-auto z-40">
                <div className="pointer-events-auto h-full">
                    <Sidebar
                        isOpen={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />
                </div>
            </div>

            <div className="flex-1 flex flex-col md:h-full w-full md:overflow-hidden relative">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 md:overflow-y-auto overflow-x-hidden p-4 md:p-6 custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
