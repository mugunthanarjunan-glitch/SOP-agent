import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Server } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth(); // Assume we created AuthContext

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Assuming backend runs on 5000
            const res = await axios.post('http://localhost:5000/auth/login', { email, password });

            // Assume backend returns { token, user: { id, role, ... } }
            login(res.data.user, res.data.token);

            if (res.data.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/chat');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
                <div>
                    <div className="flex justify-center flex-col items-center">
                        <div className="bg-blue-600 p-3 rounded-full mb-3">
                            <Server className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-center text-3xl font-extrabold text-slate-900">OpsMind AI</h2>
                    </div>
                    <h2 className="mt-6 text-center text-xl font-bold text-slate-700">Sign in to your account</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email address</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 block w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 py-3 border bg-slate-50"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Password</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 block w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 py-3 border bg-slate-50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-md disabled:bg-blue-300"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <span className="text-slate-500">Don't have an account? </span>
                    <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">Register</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
