import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

const ChatAgentView = () => {
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('chat_history');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Convert string timestamps back to Date objects
                return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        }
        return [
            {
                id: 1,
                type: 'bot',
                text: 'Hello! I\'m your AI assistant. How can I help you today?',
                timestamp: new Date()
            }
        ];
    });

    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
        // Save to localStorage whenever messages change
        localStorage.setItem('chat_history', JSON.stringify(messages));
    }, [messages]);

    const handleClearChat = () => {
        const initialMessage = [{
            id: 1,
            type: 'bot',
            text: 'Hello! I\'m your AI assistant. How can I help you today?',
            timestamp: new Date()
        }];
        setMessages(initialMessage);
        localStorage.removeItem('chat_history');
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!inputValue.trim()) return;

        const textInput = inputValue;

        // Add user message
        const userMessage = {
            id: Date.now(),
            type: 'user',
            text: textInput,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
            const response = await fetch(`${BACKEND_URL}/documents/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: textInput })
            });

            const data = await response.json();

            const botReply = {
                id: Date.now() + 1,
                type: 'bot',
                text: data.answer || 'I could not find an answer in your documents.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botReply]);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: "Sorry, I'm having trouble connecting to the Knowledge Base.",
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#eef6f6] rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Bot size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Chat Agent</h2>
                            <p className="text-teal-50 text-sm">Knowledge Base Assistant</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg border border-white/20 transition-colors"
                    >
                        Clear History
                    </button>
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
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
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

                {isLoading && (
                    <div className="flex gap-3 justify-start animate-pulse">
                        <div className="bg-teal-500 p-2 rounded-full h-10 w-10 flex items-center justify-center shrink-0">
                            <Bot size={20} className="text-white" />
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm rounded-bl-sm">
                            <div className="flex gap-1 h-4 items-center">
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    </div>
                )}
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
