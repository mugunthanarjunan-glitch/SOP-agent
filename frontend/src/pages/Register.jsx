import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Server, User, Briefcase } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); // Default to user, but let them pick purely for this internship project demo
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Assuming backend runs on 5000
            const res = await axios.post('http://localhost:5000/auth/register', { name, email, password, role });

            // Optionally login immediately after registering
            login(res.data.user, res.data.token);

            if (res.data.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/chat');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
                <div>
                    <div className="flex justify-center items-center flex-col">
                        <div className="bg-blue-600 p-3 rounded-full mb-3">
                            <Server className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-center text-3xl font-extrabold text-slate-900">OpsMind AI</h2>
                    </div>
                    <h2 className="mt-6 text-center text-xl font-bold text-slate-700">Create an account</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Full Name</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-10 block w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 py-3 border bg-slate-50"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
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
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Role Selection (Demo Purpose)</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none pl-3 pt-[0.8rem]">
                                    <Briefcase className="h-5 w-5 text-slate-400" />
                                </div>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="pl-10 block w-full border-slate-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500 py-3 border bg-slate-50 text-slate-700"
                                >
                                    <option value="user">Regular User (Chat Access)</option>
                                    <option value="admin">Admin (Upload/Manage PDFs)</option>
                                </select>
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
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <span className="text-slate-500">Already have an account? </span>
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
