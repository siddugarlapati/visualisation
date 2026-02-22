import React from 'react';
import { NavLink } from 'react-router-dom';
import { Code, Code2, Zap, Brain, Home as HomeIcon, Info, Database, Languages, Layers } from 'lucide-react';

const Navbar = () => {
    const navLinks = [
        { to: '/', label: 'Home', icon: HomeIcon },
        { to: '/tech-stacks', label: 'Tech Stacks', icon: Layers },
        { to: '/architecture-builder', label: 'Sandbox', icon: Database },
        { to: '/dsa-visualiser', label: 'DSA', icon: Code },
        { to: '/concept-visualiser', label: 'Concepts', icon: Code2 },
        { to: '/ml-visualiser', label: 'ML', icon: Brain },
        { to: '/nlp-visualiser', label: 'NLP', icon: Languages },
        { to: '/leetcode-visualiser', label: 'LeetCode', icon: Zap },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <NavLink to="/" className="flex items-center gap-2 group">
                        <img
                            src="/anurag-logo.svg"
                            alt="Anurag University"
                            className="h-10 transition-transform group-hover:scale-105"
                        />
                    </NavLink>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        {navLinks.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-[#C41E3A] text-white shadow-md'
                                        : 'text-[#1E3A5F] hover:text-[#C41E3A] hover:bg-red-50'
                                    }`
                                }
                            >
                                <Icon size={16} />
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

