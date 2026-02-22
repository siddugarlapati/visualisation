import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Code, Layers, Brain, X, Database, Languages, Shield, Layout, Server, MonitorPlay } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);

    const handleChoice = (path) => {
        setShowModal(false);
        navigate(path);
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] flex items-center justify-center relative overflow-hidden font-sans">
            {/* Elegant Professional Background Grid */}
            <div 
                className="absolute inset-0 z-0" 
                style={{
                    backgroundImage: 'linear-gradient(rgba(30,58,95,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,95,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    backgroundPosition: 'center center'
                }}
            />
            
            {/* Very Subtle Gradient Overlay for Depth */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-white/50" />

            {/* Main content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center">
                
                {/* Refined Badge */}
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 shadow-sm rounded-full mb-10 transition-shadow hover:shadow-md">
                    <MonitorPlay className="text-[#C41E3A]" size={18} />
                    <span className="text-sm font-semibold tracking-wide text-[#1E3A5F] uppercase">The Ultimate Visualization Engine</span>
                </div>

                {/* Highly Professional Hero Heading */}
                <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tight text-[#1E3A5F]">
                    Master Technology
                    <br />
                    <span className="text-[#C41E3A]">Through Vision.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
                    The comprehensive, one-stop platform for deeply understanding <strong className="font-semibold text-[#1E3A5F]">Data Structures, Machine Learning, and Full-Stack Architectures</strong> through cinematic, interactive visualizations.
                </p>

                {/* Primary CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <button
                        onClick={() => setShowModal(true)}
                        className="group flex items-center gap-3 px-10 py-5 bg-[#C41E3A] hover:bg-[#A01830] text-white font-bold rounded-xl shadow-lg shadow-red-900/10 transition-all duration-300 transform hover:-translate-y-1"
                    >
                        <span>Launch Engine</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1-5 transition-transform" />
                    </button>

                    <button
                        onClick={() => navigate('/about')}
                        className="flex items-center gap-3 px-10 py-5 bg-white hover:bg-gray-50 border border-gray-200 text-[#1E3A5F] font-semibold rounded-xl shadow-sm transition-all duration-300"
                    >
                        <span>Documentation</span>
                    </button>
                </div>

                {/* Professional Data Points / Features */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-24 max-w-4xl mx-auto border-t border-gray-200 pt-12">
                    {[
                        { label: 'DSA & LeetCode', val: '3000+' },
                        { label: 'ML Algorithms', val: 'Comprehensive' },
                        { label: 'Tech Stacks', val: 'Full-Stack' },
                        { label: 'Architecture', val: 'Cinematic 3D' }
                    ].map((stat, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-[#1E3A5F] mb-1">{stat.val}</span>
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hyper-Professional Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E3A5F]/40 backdrop-blur-md" onClick={() => setShowModal(false)}>
                    <div 
                        className="relative bg-white rounded-2xl p-8 max-w-5xl w-full mx-4 shadow-2xl animate-fadeIn border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button 
                            onClick={() => setShowModal(false)}
                            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-400 hover:text-gray-700" />
                        </button>

                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-black text-[#1E3A5F] mb-3">Select Domain</h2>
                            <p className="text-gray-500 font-medium tracking-wide">Choose an architectural track to begin visualization.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            {/* Tech Stacks Option (New) */}
                            <button
                                onClick={() => handleChoice('/tech-stacks')}
                                className="group flex flex-col items-start p-6 bg-white border border-gray-200 hover:border-[#C41E3A] hover:shadow-lg rounded-xl transition-all duration-300 text-left"
                            >
                                <div className="w-12 h-12 mb-5 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-[#C41E3A]/10 transition-colors">
                                    <Layers size={24} className="text-[#1E3A5F] group-hover:text-[#C41E3A] transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">Tech Stacks</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">Java Full-Stack, MERN, MEAN, Data Science, Cyber Security & UI Frameworks.</p>
                            </button>

                            {/* DSA Option */}
                            <button
                                onClick={() => handleChoice('/dsa-visualiser')}
                                className="group flex flex-col items-start p-6 bg-white border border-gray-200 hover:border-[#C41E3A] hover:shadow-lg rounded-xl transition-all duration-300 text-left"
                            >
                                <div className="w-12 h-12 mb-5 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-[#C41E3A]/10 transition-colors">
                                    <Database size={24} className="text-[#1E3A5F] group-hover:text-[#C41E3A] transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">DSA Core</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">Comprehensive data structures and algorithmic theory visualized in 3D.</p>
                            </button>

                            {/* ML Option */}
                            <button
                                onClick={() => handleChoice('/ml-visualiser')}
                                className="group flex flex-col items-start p-6 bg-white border border-gray-200 hover:border-[#C41E3A] hover:shadow-lg rounded-xl transition-all duration-300 text-left"
                            >
                                <div className="w-12 h-12 mb-5 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-[#C41E3A]/10 transition-colors">
                                    <Brain size={24} className="text-[#1E3A5F] group-hover:text-[#C41E3A] transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">Machine Learning</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">Neural Networks, Regression, Classification, and Deep Learning architectures.</p>
                            </button>

                            {/* LeetCode Option */}
                            <button
                                onClick={() => handleChoice('/leetcode-visualiser')}
                                className="group flex flex-col items-start p-6 bg-white border border-gray-200 hover:border-[#1E3A5F] hover:shadow-lg rounded-xl transition-all duration-300 text-left"
                            >
                                <div className="w-12 h-12 mb-5 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-[#1E3A5F]/10 transition-colors">
                                    <Code size={24} className="text-[#1E3A5F] transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">LeetCode Master</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">Step-by-step resolution logic for competitive programming problems.</p>
                            </button>

                            {/* NLP Option */}
                            <button
                                onClick={() => handleChoice('/nlp-visualiser')}
                                className="group flex flex-col items-start p-6 bg-white border border-gray-200 hover:border-[#1E3A5F] hover:shadow-lg rounded-xl transition-all duration-300 text-left"
                            >
                                <div className="w-12 h-12 mb-5 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-[#1E3A5F]/10 transition-colors">
                                    <Languages size={24} className="text-[#1E3A5F] transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">NLP Pipeline</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">Natural Language Processing, tokenization, embeddings, and transformers.</p>
                            </button>
                             {/* Coming Soon */}
                             <div className="flex flex-col items-center justify-center p-6 bg-gray-50/50 border border-gray-100 border-dashed rounded-xl">
                                <Shield size={24} className="text-gray-300 mb-3" />
                                <span className="text-sm font-semibold text-gray-400">Cyber Sec Module Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;

