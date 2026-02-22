import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodePanel = ({ solutions, selectedLanguage, onLanguageChange, highlightLines = [] }) => {
    // Determine the code to display based on selected language
    const getCode = () => {
        if (!solutions) return "// No solution available";
        return solutions[selectedLanguage] || "// Code not generated for this language";
    };

    // Styling for highlighted lines
    const customStyle = {
        backgroundColor: '#0f172a', // Slate-900
        margin: 0,
        padding: '1rem',
        fontSize: '0.85rem',
        lineHeight: '1.5',
        height: '100%',
    };

    const lineProps = (lineNumber) => {
        const style = { display: 'block', width: '100%' };
        // Check if this line is in the highlight array
        if (highlightLines.includes(lineNumber)) {
            style.backgroundColor = 'rgba(74, 222, 128, 0.2)'; // Green tint
            style.borderLeft = '3px solid #4ade80';
        }
        return { style };
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] border-b border-slate-700">
            {/* Language Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-900/50">
                {['python', 'java', 'cpp'].map((lang) => (
                    <button
                        key={lang}
                        onClick={() => onLanguageChange(lang)}
                        className={`
                            px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors
                            ${selectedLanguage === lang 
                                ? 'bg-indigo-600 text-white border-b-2 border-indigo-400' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                        `}
                    >
                        {lang === 'cpp' ? 'C++' : lang}
                    </button>
                ))}
            </div>

            {/* Code Display Area - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <SyntaxHighlighter
                    language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                    style={vscDarkPlus}
                    customStyle={customStyle}
                    showLineNumbers={true}
                    wrapLines={true}
                    lineProps={lineProps}
                >
                    {getCode()}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

export default CodePanel;
