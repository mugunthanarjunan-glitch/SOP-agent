import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Send, Loader2, Bot, User, LogOut, Info, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ChatInterface = () => {
    const { user, token, logout } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isStreaming]);

    const loadSessions = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/chat/sessions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(res.data);
            if (res.data.length > 0 && !currentSessionId) {
                loadSessionMessages(res.data[0]._id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [token]);

    const loadSessionMessages = async (sessionId) => {
        setCurrentSessionId(sessionId);
        try {
            const res = await axios.get(`http://localhost:5000/api/chat/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleNewSession = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/chat/session', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions([res.data, ...sessions]);
            setCurrentSessionId(res.data._id);
            setMessages([]);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !currentSessionId) return;

        const question = input;
        setInput('');

        // Optimistically add user message
        const newMessage = { role: 'user', content: question, _id: Date.now() };
        setMessages(prev => [...prev, newMessage]);
        setIsStreaming(true);

        try {
            // Create a temporary assistant message to stream into
            const tempId = Date.now() + 1;
            setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [], _id: tempId, isStreaming: true }]);

            const reqBody = { question, sessionId: currentSessionId };
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(reqBody)
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let streamDone = false;

            while (!streamDone) {
                const { value, done } = await reader.read();
                if (done) {
                    streamDone = true;
                    break;
                }

                const chunkString = decoder.decode(value, { stream: true });
                const dataLines = chunkString.split('\n\n').filter(Boolean);

                dataLines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '');
                        try {
                            const dataObj = JSON.parse(dataStr);
                            if (dataObj.type === 'sources') {
                                setMessages(prev => prev.map(msg =>
                                    msg._id === tempId ? { ...msg, sources: dataObj.sources } : msg
                                ));
                            } else if (dataObj.type === 'content') {
                                setMessages(prev => prev.map(msg =>
                                    msg._id === tempId ? { ...msg, content: msg.content + dataObj.content } : msg
                                ));
                            } else if (dataObj.type === 'done') {
                                setMessages(prev => prev.map(msg =>
                                    msg._id === tempId ? { ...msg, isStreaming: false } : msg
                                ));
                                setIsStreaming(false);
                                loadSessions(); // Reload sessions to update session titles/last messages
                            }
                        } catch (e) {
                            // Sometimes chunks are split poorly, simply ignore partial parse failures
                        }
                    }
                });
            }
        } catch (err) {
            console.error(err);
            setIsStreaming(false);
            setMessages(prev => [...prev, { role: 'assistant', content: 'There was an error generating the response.', _id: Date.now() }]);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Bot className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">OpsMind AI</h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <button
                        onClick={handleNewSession}
                        className="w-full flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 p-3 rounded-xl font-medium hover:bg-blue-100 transition"
                    >
                        <span>+ New Chat</span>
                    </button>

                    <div className="mt-6 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Recent Chats</div>
                    {sessions.map(session => (
                        <button
                            key={session._id}
                            onClick={() => loadSessionMessages(session._id)}
                            className={`w-full text-left p-3 rounded-xl transition ${currentSessionId === session._id ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <div className="font-medium text-sm truncate">{session.title || 'New Chat'}</div>
                            <div className="text-xs text-slate-400 truncate mt-1">{session.lastMessage || 'Start a conversation...'}</div>
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-200">
                    <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white p-2 rounded-full shadow-sm">
                                <User className="h-5 w-5 text-slate-600" />
                            </div>
                            <div className="text-sm font-medium text-slate-800">{user?.name}</div>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-slate-700">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b border-slate-100 flex items-center px-8 bg-white z-10">
                    <div className="flex items-center text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                        <Info className="w-4 h-4 mr-2" />
                        Answers are sourced directly from valid corporate documents.
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center mt-32 space-y-4 text-center">
                                <div className="bg-blue-50 p-4 rounded-full">
                                    <Bot className="h-12 w-12 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">How can I help you today?</h2>
                                <p className="text-slate-500 max-w-sm">Ask me anything strictly according to the corporate SOP documents.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div key={msg._id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="mr-4 mt-1 bg-blue-100 p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0">
                                            <Bot className="h-5 w-5 text-blue-700" />
                                        </div>
                                    )}

                                    <div className={`max-w-[75%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-3xl rounded-tr-sm px-6 py-4' : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-3xl rounded-tl-sm px-6 py-4 shadow-sm'}`}>
                                        <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                                        {msg.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-slate-400 animate-pulse" />}

                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center">
                                                    <BookOpen className="w-3 h-3 mr-1" /> Sources
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.sources.map((src, i) => (
                                                        <div key={i} className="inline-flex items-center bg-white border border-slate-200 shadow-sm text-xs rounded-lg px-3 py-1.5 text-slate-600">
                                                            <span className="font-medium mr-1 text-slate-800">{src.document}</span>
                                                            (Page {src.page})
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-slate-100">
                    <div className="max-w-3xl mx-auto relative">
                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isStreaming || !currentSessionId}
                                placeholder="Ask about refunds, policies, or procedures..."
                                className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm disabled:bg-slate-100"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isStreaming || !currentSessionId}
                                className="absolute right-2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-sm"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                        <div className="text-center mt-3 text-xs text-slate-400">
                            OpsMind AI can make mistakes. Verify important information from sources.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
