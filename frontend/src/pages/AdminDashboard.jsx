import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileUp, Trash2, FileText, Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const { user, token, logout } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const navigate = useNavigate();

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/documents', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDocuments(res.data);
        } catch (err) {
            console.error("Error fetching documents:", err);
        } finally {
            setLoadingDocs(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('pdf', file);

        try {
            await axios.post('http://localhost:5000/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            setFile(null);
            // document upload input field reset could go here
            document.getElementById('file-upload').value = null;
            fetchDocuments();
        } catch (err) {
            console.error("Error uploading document:", err);
            alert("Failed to upload document");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (documentName) => {
        if (!window.confirm(`Are you sure you want to delete ${documentName}?`)) return;
        try {
            await axios.delete(`http://localhost:5000/api/documents/${documentName}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchDocuments();
        } catch (err) {
            console.error("Error deleting document:", err);
            alert("Failed to delete document");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <FileUp className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">OpsMind Admin</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-slate-600">Logged in as {user?.name} (Admin)</span>
                    <button onClick={handleLogout} className="text-slate-500 hover:text-red-500 transition-colors">
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload New SOP Source</h2>
                    <div className="flex items-center space-x-4">
                        <input
                            id="file-upload"
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 cursor-pointer"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition flex items-center space-x-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
                            <span>{uploading ? 'Processing...' : 'Upload PDF'}</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-800">Knowledge Base Documents</h2>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                            {documents.length} Docs
                        </span>
                    </div>
                    {loadingDocs ? (
                        <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
                    ) : documents.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">No documents in the knowledge base. Upload one above.</div>
                    ) : (
                        <ul className="divide-y divide-slate-200">
                            {documents.map((doc, idx) => (
                                <li key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-900">{doc.documentName || 'Unknown Document'}</h3>
                                            <p className="text-sm text-slate-500">{doc.chunkCount} vector chunks generated</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(doc.documentName)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
