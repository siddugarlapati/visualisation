import React from 'react';
import { Sparkles, Edit3, BookOpen } from 'lucide-react';

/**
 * Reusable Input Mode Selector Component
 * 
 * @param {Object} props
 * @param {string} props.mode - Current selected mode ('custom' | 'auto' | 'preset')
 * @param {Function} props.onChange - Callback when mode changes: (newMode: string) => void
 * @param {boolean} [props.showPresets=false] - Whether to show the Presets option
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.labels] - Custom labels for each mode
 */
const InputModeSelector = ({ 
    mode, 
    onChange, 
    showPresets = false,
    className = '',
    labels = {}
}) => {
    const defaultLabels = {
        custom: 'Custom',
        auto: 'Auto',
        preset: 'Presets'
    };

    const finalLabels = { ...defaultLabels, ...labels };

    const modes = [
        { 
            id: 'custom', 
            label: finalLabels.custom,
            icon: Edit3,
            color: 'blue',
            description: 'Provide your own input data'
        },
        { 
            id: 'auto', 
            label: finalLabels.auto,
            icon: Sparkles,
            color: 'green',
            description: 'AI generates test data automatically'
        },
        ...(showPresets ? [{
            id: 'preset',
            label: finalLabels.preset,
            icon: BookOpen,
            color: 'purple',
            description: 'Use pre-configured examples'
        }] : [])
    ];

    const getColorClasses = (modeId, isActive) => {
        const colors = {
            blue: {
                active: 'bg-blue-600/20 border-blue-500/50 text-blue-300',
                inactive: 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/60'
            },
            green: {
                active: 'bg-green-600/20 border-green-500/50 text-green-300',
                inactive: 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/60'
            },
            purple: {
                active: 'bg-purple-600/20 border-purple-500/50 text-purple-300',
                inactive: 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/60'
            }
        };

        const modeData = modes.find(m => m.id === modeId);
        const colorScheme = colors[modeData?.color] || colors.blue;
        return isActive ? colorScheme.active : colorScheme.inactive;
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                Input Mode
            </label>
            
            <div className="flex gap-2">
                {modes.map((modeOption) => {
                    const Icon = modeOption.icon;
                    const isActive = mode === modeOption.id;
                    
                    return (
                        <button
                            key={modeOption.id}
                            onClick={() => onChange(modeOption.id)}
                            className={`
                                flex-1 px-4 py-3 rounded-xl border transition-all duration-200
                                flex flex-col items-center gap-2
                                ${getColorClasses(modeOption.id, isActive)}
                                ${isActive ? 'shadow-lg' : 'hover:border-slate-600'}
                            `}
                            title={modeOption.description}
                        >
                            <Icon size={18} />
                            <span className="text-sm font-medium">
                                {modeOption.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Description hint */}
            <p className="text-xs text-slate-500 mt-2">
                {modes.find(m => m.id === mode)?.description}
            </p>
        </div>
    );
};

export default InputModeSelector;
