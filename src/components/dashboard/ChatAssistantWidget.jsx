import React from 'react';
import { Bot } from 'lucide-react';
import data from '../../data/dashboardData.json';

const ChatAssistantWidget = () => {
    const { chatAssistant } = data;

    return (
        <div className="bg-[#eef6f6] rounded-2xl p-5 shadow-sm h-full flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-1">{chatAssistant.title}</h2>
            <p className="text-xs text-slate-500 mb-4">{chatAssistant.subtitle}</p>

            <div className="bg-[#e2ebeb] p-4 rounded-xl flex gap-3 text-xs text-slate-700 leading-relaxed max-h-[150px] overflow-auto custom-scrollbar mb-4">
                <Bot className="text-teal-600 shrink-0" size={24} />
                <div>
                    {chatAssistant.intro.split('\n\n').map((para, i) => (
                        <p key={i} className={i > 0 ? "mt-2" : ""}>{para}</p>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 justify-start">
                {chatAssistant.faqs.map((faq, i) => (
                    <span key={i} className="bg-[#e2ebeb] text-slate-700 text-[10px] px-3 py-1.5 rounded-full font-medium border border-teal-100/30">
                        {faq}
                    </span>
                ))}
            </div>

            <div className="mt-auto flex justify-center w-full">
                <button className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-6 py-2 rounded-lg shadow-md transition-colors">
                    Start Session
                </button>
            </div>
        </div>
    );
};

export default ChatAssistantWidget;
