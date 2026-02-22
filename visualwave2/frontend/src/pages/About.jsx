import React from 'react';
import { Code, Zap, Layers, Sparkles, Box, GitBranch } from 'lucide-react';

const About = () => {
    const features = [
        {
            icon: Box,
            title: '3D Visualizations',
            description: 'Watch algorithms unfold in an immersive three-dimensional space.',
            gradient: 'from-blue-500 to-cyan-500',
        },
        {
            icon: Zap,
            title: 'GSAP Animations',
            description: 'Smooth, cinematic transitions powered by the GSAP animation library.',
            gradient: 'from-amber-500 to-orange-500',
        },
        {
            icon: GitBranch,
            title: 'Step-by-Step',
            description: 'Navigate through each algorithm step with detailed explanations.',
            gradient: 'from-violet-500 to-purple-500',
        },
        {
            icon: Layers,
            title: 'Multiple Structures',
            description: 'Arrays, trees, graphs, linked lists, and more data structures.',
            gradient: 'from-emerald-500 to-teal-500',
        },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-white via-gray-50 to-red-50 py-20 px-6">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-1/4 w-72 h-72 bg-[#C41E3A]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-[#1E3A5F]/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Header section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A]/10 border border-[#C41E3A]/20 rounded-full mb-6">
                        <Sparkles className="text-[#C41E3A]" size={16} />
                        <span className="text-sm font-medium text-[#C41E3A]">About the Project</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1E3A5F] mb-6">
                        Algorithm Visualization
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C41E3A] to-[#1E3A5F]">
                            Reimagined
                        </span>
                    </h1>
                </div>

                {/* Main description card */}
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 md:p-12 mb-16 shadow-lg">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-gradient-to-br from-[#C41E3A] to-[#A01830] rounded-xl shadow-lg">
                            <Code className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">VISUALWAVE</h2>
                            <p className="text-gray-600 text-sm">3D Algorithm Learning Platform</p>
                        </div>
                    </div>

                    <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                        A 3D algorithm learning platform built using{' '}
                        <span className="text-[#C41E3A] font-semibold">Three.js</span> +{' '}
                        <span className="text-[#1E3A5F] font-semibold">GSAP</span>, designed to visually 
                        explain algorithms through dynamic motion and spatial clarity.
                    </p>

                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <p className="text-gray-600 leading-relaxed">
                            Whether you're preparing for coding interviews or learning data structures, 
                            our platform transforms abstract concepts into tangible, memorable experiences. 
                            See pointers move, watch trees balance, and understand sorting algorithms 
                            through beautiful 3D animations.
                        </p>
                    </div>
                </div>

                {/* Features grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {features.map(({ icon: Icon, title, description, gradient }) => (
                        <div
                            key={title}
                            className="group bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-[#C41E3A]/30 rounded-xl p-6 transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                            <div className={`inline-flex p-3 bg-gradient-to-br ${gradient} rounded-xl shadow-lg mb-4`}>
                                <Icon className="text-white" size={22} />
                            </div>
                            <h3 className="text-lg font-bold text-[#1E3A5F] mb-2">{title}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
                        </div>
                    ))}
                </div>

                {/* Tech stack */}
                <div className="mt-16 text-center">
                    <p className="text-gray-500 text-sm mb-4">Built with</p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {['React', 'Three.js', 'GSAP', 'Vite', 'Tailwind CSS'].map((tech) => (
                            <div
                                key={tech}
                                className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm text-[#1E3A5F] shadow-sm"
                            >
                                {tech}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
