import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

const ChatAgentView = () => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            text: 'Hello! I\'m your AI assistant. How can I help you today?',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();

        if (!inputValue.trim()) return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            type: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');

        // Auto-reply after 500ms
        setTimeout(() => {
            const botReply = {
                id: Date.now() + 1,
                type: 'bot',
                text: 'This feature is currently under development. Stay tuned for updates!',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botReply]);
        }, 500);
    };

    return (
        <div className="flex flex-col h-full bg-[#eef6f6] rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <Bot size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Chat Agent</h2>
                        <p className="text-teal-50 text-sm">AI-powered assistant</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.type === 'bot' && (
                            <div className="bg-teal-500 p-2 rounded-full h-10 w-10 flex items-center justify-center shrink-0">
                                <Bot size={20} className="text-white" />
                            </div>
                        )}

                        <div className={`max-w-[70%] ${message.type === 'user' ? 'order-1' : ''}`}>
                            <div
                                className={`rounded-2xl px-4 py-3 ${message.type === 'user'
                                    ? 'bg-teal-500 text-white rounded-br-sm'
                                    : 'bg-white text-slate-800 rounded-bl-sm shadow-sm'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed">{message.text}</p>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 px-2">
                                {message.timestamp.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>

                        {message.type === 'user' && (
                            <div className="bg-slate-600 p-2 rounded-full h-10 w-10 flex items-center justify-center shrink-0">
                                <User size={20} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-200 p-4 shrink-0">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl 
                                 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
                                 text-slate-800 placeholder-slate-400"
                    />
                    <button
                        type="submit"
                        className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl
                                 transition-colors flex items-center gap-2 font-medium shrink-0"
                    >
                        <Send size={18} />
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatAgentView;
