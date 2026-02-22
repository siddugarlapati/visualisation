import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
    Play, Pause, SkipForward, SkipBack, RotateCcw,
    AlertTriangle, CheckCircle, Code2, ChevronDown,
    Loader2, Zap, Clock, HardDrive, Eye
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════
// PRESET EXAMPLES (fallback if API is unreachable)
// ═══════════════════════════════════════════════════════════════════
const FALLBACK_PRESETS = {
    reverse_array: {
        title: 'Reverse Array',
        description: 'Reverse an array in-place using two pointers',
        code: `arr = [1, 2, 3, 4, 5]
left = 0
right = len(arr) - 1
while left < right:
    arr[left], arr[right] = arr[right], arr[left]
    left = left + 1
    right = right - 1`,
    },
    binary_search: {
        title: 'Binary Search',
        description: 'Search for a target in a sorted array',
        code: `arr = [1, 3, 5, 7, 9, 11, 13, 15]
target = 7
left = 0
right = len(arr) - 1
found = -1
while left <= right:
    mid = (left + right) // 2
    if arr[mid] == target:
        found = mid
        break
    elif arr[mid] < target:
        left = mid + 1
    else:
        right = mid - 1`,
    },
    two_sum: {
        title: 'Two Sum',
        description: 'Find two numbers that add up to target',
        code: `nums = [2, 7, 11, 15]
target = 9
seen = {}
result = []
for i in range(len(nums)):
    complement = target - nums[i]
    if complement in seen:
        result = [seen[complement], i]
        break
    seen[nums[i]] = i`,
    },
    fibonacci: {
        title: 'Fibonacci (Recursion)',
        description: 'Calculate the nth Fibonacci number recursively',
        code: `def fibonacci(n):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    return fibonacci(n - 1) + fibonacci(n - 2)

result = fibonacci(5)`,
    },
    bubble_sort: {
        title: 'Bubble Sort',
        description: 'Sort an array using bubble sort',
        code: `arr = [64, 34, 25, 12, 22, 11, 90]
n = len(arr)
for i in range(n):
    for j in range(0, n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]`,
    },
    sliding_window: {
        title: 'Sliding Window Max Sum',
        description: 'Find the maximum sum of a subarray of size k',
        code: `arr = [1, 4, 2, 10, 23, 3, 1, 0, 20]
k = 4
window_sum = sum(arr[0:k])
max_sum = window_sum
for i in range(k, len(arr)):
    window_sum = window_sum + arr[i] - arr[i - k]
    if window_sum > max_sum:
        max_sum = window_sum`,
    },
};

// ═══════════════════════════════════════════════════════════════════
// COMPLEXITY ANALYSIS (client-side heuristics)
// ═══════════════════════════════════════════════════════════════════
function analyzeComplexity(code, steps) {
    const lines = code.split('\n');
    let nestedLoops = 0;
    let maxNest = 0;
    let hasRecursion = false;
    let hasDict = false;

    for (const line of lines) {
        const stripped = line.trimStart();
        if (stripped.startsWith('for ') || stripped.startsWith('while ')) {
            nestedLoops++;
            maxNest = Math.max(maxNest, nestedLoops);
        }
        if (stripped === '' || (!stripped.startsWith('for ') && !stripped.startsWith('while ') && !stripped.startsWith(' '))) {
            nestedLoops = 0;
        }
        if (stripped.startsWith('def ') && code.includes(stripped.split('(')[0].replace('def ', '').trim() + '(')) {
            hasRecursion = true;
        }
        if (stripped.includes('{}') || stripped.includes('dict(') || stripped.includes(' in seen') || stripped.includes(' in map')) {
            hasDict = true;
        }
    }

    let time = 'O(n)';
    let space = 'O(1)';

    if (hasRecursion) {
        time = 'O(2^n)';
        space = 'O(n)';
    } else if (maxNest >= 2) {
        time = 'O(n²)';
        space = 'O(1)';
    } else if (code.includes('// 2') || code.includes('mid')) {
        time = 'O(log n)';
        space = 'O(1)';
    }

    if (hasDict) space = 'O(n)';
    if (code.includes('.sort') || code.includes('sorted(')) {
        time = 'O(n log n)';
    }

    // Detect pattern
    let pattern = 'Iteration';
    if (code.includes('left') && code.includes('right') && !code.includes('mid')) {
        pattern = 'Two Pointers';
    } else if (code.includes('mid') && (code.includes('left') || code.includes('lo'))) {
        pattern = 'Binary Search';
    } else if (code.includes('window') || code.includes('k =')) {
        pattern = 'Sliding Window';
    } else if (hasRecursion) {
        pattern = 'Recursion';
    } else if (hasDict) {
        pattern = 'Hash Map';
    }

    return { time, space, pattern };
}


// ═══════════════════════════════════════════════════════════════════
// VISUALIZATION COMPONENTS
// ═══════════════════════════════════════════════════════════════════

/** Render an array variable with optional pointer highlights */
const ArrayVisualization = ({ name, values, pointers = {} }) => {
    if (!Array.isArray(values)) return null;
    return (
        <div className="mb-4">
            <div className="text-xs text-slate-400 mb-1 font-mono">{name}</div>
            <div className="flex gap-1 flex-wrap">
                {values.map((val, idx) => {
                    const pointerNames = Object.entries(pointers)
                        .filter(([_, v]) => v === idx)
                        .map(([k]) => k);
                    const isHighlighted = pointerNames.length > 0;

                    return (
                        <div key={idx} className="flex flex-col items-center">
                            {pointerNames.length > 0 && (
                                <div className="flex gap-1 mb-1">
                                    {pointerNames.map(p => (
                                        <span key={p} className="text-[10px] px-1 py-0.5 bg-indigo-500/30 text-indigo-300 rounded font-mono">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div
                                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-mono font-bold transition-all duration-300 ${
                                    isHighlighted
                                        ? 'bg-indigo-500/40 text-indigo-200 border-2 border-indigo-400 shadow-lg shadow-indigo-500/20 scale-110'
                                        : 'bg-slate-800/80 text-slate-300 border border-slate-600/50'
                                }`}
                            >
                                {String(val).length > 4 ? '…' : String(val)}
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 font-mono">{idx}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/** Render a dict/hashmap variable */
const DictVisualization = ({ name, value }) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entries = Object.entries(value);
    return (
        <div className="mb-4">
            <div className="text-xs text-slate-400 mb-1 font-mono">{name}</div>
            <div className="flex gap-1 flex-wrap">
                {entries.map(([k, v], idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <div className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-t text-xs font-mono border border-amber-500/30 border-b-0">
                            {String(k)}
                        </div>
                        <div className="px-2 py-1 bg-slate-800/80 text-slate-300 rounded-b text-xs font-mono border border-slate-600/50 border-t-0">
                            {String(v)}
                        </div>
                    </div>
                ))}
                {entries.length === 0 && (
                    <span className="text-xs text-slate-500 italic">empty</span>
                )}
            </div>
        </div>
    );
};

/** Render a scalar variable */
const ScalarVisualization = ({ name, value }) => (
    <div className="inline-flex items-center gap-2 mr-3 mb-2 px-3 py-1.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
        <span className="text-xs text-slate-400 font-mono">{name}</span>
        <span className="text-xs text-slate-500">=</span>
        <span className={`text-sm font-mono font-bold ${
            typeof value === 'number' ? 'text-emerald-400' :
            typeof value === 'string' ? 'text-amber-400' :
            typeof value === 'boolean' ? 'text-sky-400' :
            value === null ? 'text-slate-500' : 'text-slate-300'
        }`}>
            {value === null ? 'None' : typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
    </div>
);


// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

const CodeVisualiser = () => {
    // ── State ──────────────────────────────────────────────────
    const [code, setCode] = useState(FALLBACK_PRESETS.reverse_array.code);
    const [selectedPreset, setSelectedPreset] = useState('reverse_array');
    const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Trace state
    const [traceSteps, setTraceSteps] = useState([]);
    const [finalVariables, setFinalVariables] = useState({});
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const playbackRef = useRef(null);

    // Complexity / analysis
    const [complexity, setComplexity] = useState(null);

    // ── Derived state ────────────────────────────────────────
    const currentStep = traceSteps[currentStepIndex] || null;
    const hasTrace = traceSteps.length > 0;
    const sourceLines = code.split('\n');

    // ── Preset selection ─────────────────────────────────────
    const handlePresetSelect = (key) => {
        const preset = FALLBACK_PRESETS[key];
        if (preset) {
            setCode(preset.code);
            setSelectedPreset(key);
            setPresetDropdownOpen(false);
            // Clear previous trace
            setTraceSteps([]);
            setFinalVariables({});
            setCurrentStepIndex(0);
            setError(null);
            setComplexity(null);
            setIsPlaying(false);
        }
    };

    // ── Execute code ─────────────────────────────────────────
    const handleVisualize = async () => {
        if (!code.trim()) {
            setError('Please enter some code to visualize.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setTraceSteps([]);
        setFinalVariables({});
        setCurrentStepIndex(0);
        setIsPlaying(false);
        setComplexity(null);

        try {
            const response = await fetch(`${API_BASE}/execute-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language: 'python' }),
            });

            const data = await response.json();

            if (!data.success || data.error) {
                setError(data.error || 'Execution failed');
                return;
            }

            if (!data.steps || data.steps.length === 0) {
                setError('No execution steps were recorded. The code may be empty or unsupported.');
                return;
            }

            // Filter to only meaningful steps (skip internal tracer overhead)
            const filteredSteps = data.steps.filter(
                s => s.event !== 'call' || s.function_name !== '<module>'
            );

            setTraceSteps(filteredSteps);
            setFinalVariables(data.final_variables || {});
            setCurrentStepIndex(0);

            // Client-side complexity analysis
            setComplexity(analyzeComplexity(code, filteredSteps));

        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                setError('Cannot connect to backend. Make sure the server is running at ' + API_BASE);
            } else {
                setError(`Error: ${err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ── Playback controls ────────────────────────────────────
    const stepForward = useCallback(() => {
        setCurrentStepIndex(prev => Math.min(prev + 1, traceSteps.length - 1));
    }, [traceSteps.length]);

    const stepBackward = useCallback(() => {
        setCurrentStepIndex(prev => Math.max(prev - 1, 0));
    }, []);

    const resetPlayback = useCallback(() => {
        setCurrentStepIndex(0);
        setIsPlaying(false);
    }, []);

    const togglePlay = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);

    // ── Auto-play effect ─────────────────────────────────────
    useEffect(() => {
        if (isPlaying && hasTrace) {
            playbackRef.current = setInterval(() => {
                setCurrentStepIndex(prev => {
                    if (prev >= traceSteps.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 800 / playbackSpeed);
        }
        return () => {
            if (playbackRef.current) clearInterval(playbackRef.current);
        };
    }, [isPlaying, playbackSpeed, hasTrace, traceSteps.length]);

    // ── Extract visualizable data from current step ──────────
    const getVisualizationData = () => {
        if (!currentStep) return { arrays: [], dicts: [], scalars: [] };

        const vars = currentStep.variables || {};
        const arrays = [];
        const dicts = [];
        const scalars = [];

        // Detect pointer variables for array visualization
        const pointerCandidates = {};

        for (const [name, value] of Object.entries(vars)) {
            if (Array.isArray(value)) {
                arrays.push({ name, values: value });
            } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                dicts.push({ name, value });
            } else {
                scalars.push({ name, value });
                // If it's an integer and could be an index, track as potential pointer
                if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
                    pointerCandidates[name] = value;
                }
            }
        }

        return { arrays, dicts, scalars, pointerCandidates };
    };

    const vizData = getVisualizationData();

    // ── Keyboard shortcuts ───────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (!hasTrace) return;
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); stepForward(); }
            if (e.key === 'ArrowLeft' || e.key === 'h') { e.preventDefault(); stepBackward(); }
            if (e.key === ' ') { e.preventDefault(); togglePlay(); }
            if (e.key === 'r') { e.preventDefault(); resetPlayback(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [hasTrace, stepForward, stepBackward, togglePlay, resetPlayback]);


    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <div className="min-h-screen bg-[#0a0f1a] pt-20">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800/50">
                <div className="max-w-[1920px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
                            <Code2 className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Code Visualizer</h1>
                            <p className="text-xs text-slate-400">Deterministic Python execution trace viewer</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50">Python 3</span>
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/30">
                            Deterministic Engine
                        </span>
                    </div>
                </div>
            </div>

            {/* Main 3-panel layout */}
            <div className="flex h-[calc(100vh-8rem)]">

                {/* ── LEFT PANEL: Editor ───────────────────────── */}
                <div className="w-[35%] min-w-[350px] border-r border-slate-800/50 flex flex-col">
                    {/* Toolbar */}
                    <div className="px-4 py-3 border-b border-slate-800/50 flex items-center gap-3">
                        {/* Preset dropdown */}
                        <div className="relative flex-1">
                            <button
                                onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/50 text-sm text-slate-300 hover:border-slate-600 transition-colors"
                            >
                                <span>{FALLBACK_PRESETS[selectedPreset]?.title || 'Select Example'}</span>
                                <ChevronDown size={14} className={`transition-transform ${presetDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {presetDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl shadow-black/30 z-50 overflow-hidden">
                                    {Object.entries(FALLBACK_PRESETS).map(([key, preset]) => (
                                        <button
                                            key={key}
                                            onClick={() => handlePresetSelect(key)}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                                key === selectedPreset
                                                    ? 'bg-indigo-500/20 text-indigo-300'
                                                    : 'text-slate-300 hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <div className="font-medium">{preset.title}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{preset.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Visualize button */}
                        <button
                            onClick={handleVisualize}
                            disabled={isLoading || !code.trim()}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                isLoading
                                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                            }`}
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Eye size={16} />
                            )}
                            {isLoading ? 'Executing…' : 'Visualize'}
                        </button>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden">
                        <Editor
                            height="100%"
                            language="python"
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            options={{
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                                minimap: { enabled: false },
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                padding: { top: 12 },
                                renderLineHighlight: 'all',
                                automaticLayout: true,
                                tabSize: 4,
                                glyphMargin: true,
                            }}
                        />
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="px-4 py-3 border-t border-red-500/20 bg-red-500/5">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-300 font-mono">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── CENTER PANEL: Visualization ──────────────── */}
                <div className="flex-1 flex flex-col min-w-[400px]">
                    {/* Playback controls */}
                    {hasTrace && (
                        <div className="px-4 py-3 border-b border-slate-800/50 flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700/50">
                                <button onClick={resetPlayback} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Reset (R)">
                                    <RotateCcw size={14} />
                                </button>
                                <button onClick={stepBackward} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Step Back (←)">
                                    <SkipBack size={14} />
                                </button>
                                <button
                                    onClick={togglePlay}
                                    className={`p-1.5 rounded transition-colors ${
                                        isPlaying
                                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    }`}
                                    title="Play/Pause (Space)"
                                >
                                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <button onClick={stepForward} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Step Forward (→)">
                                    <SkipForward size={14} />
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="flex-1 flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={traceSteps.length - 1}
                                    value={currentStepIndex}
                                    onChange={(e) => {
                                        setCurrentStepIndex(parseInt(e.target.value));
                                        setIsPlaying(false);
                                    }}
                                    className="flex-1 h-1.5 accent-emerald-500 cursor-pointer"
                                />
                                <span className="text-xs text-slate-400 font-mono min-w-[60px] text-right">
                                    {currentStepIndex + 1} / {traceSteps.length}
                                </span>
                            </div>

                            {/* Speed control */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Speed</span>
                                <select
                                    value={playbackSpeed}
                                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                                    className="bg-slate-800/60 text-slate-300 text-xs border border-slate-700/50 rounded px-2 py-1"
                                >
                                    <option value={0.5}>0.5x</option>
                                    <option value={1}>1x</option>
                                    <option value={2}>2x</option>
                                    <option value={3}>3x</option>
                                    <option value={5}>5x</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Visualization area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!hasTrace && !isLoading && !error && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <Code2 size={48} className="mb-4 text-slate-600" />
                                <p className="text-lg font-medium text-slate-400">Write or select code, then click Visualize</p>
                                <p className="text-sm mt-2">The execution trace will appear here</p>
                                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-xs border border-slate-700">Space</kbd>
                                    <span className="text-xs">Play/Pause</span>
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-xs border border-slate-700">← →</kbd>
                                    <span className="text-xs">Step</span>
                                    <kbd className="px-2 py-1 bg-slate-800 rounded text-xs border border-slate-700">R</kbd>
                                    <span className="text-xs">Reset</span>
                                </div>
                            </div>
                        )}

                        {isLoading && (
                            <div className="h-full flex flex-col items-center justify-center">
                                <Loader2 size={36} className="animate-spin text-emerald-500 mb-4" />
                                <p className="text-slate-400">Executing code deterministically…</p>
                                <p className="text-xs text-slate-500 mt-1">Using sys.settrace — no LLM involved</p>
                            </div>
                        )}

                        {hasTrace && currentStep && (
                            <div className="space-y-6 animate-fadeIn">
                                {/* Current line highlight */}
                                <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
                                    <div className="px-4 py-2 border-b border-slate-700/30 flex items-center justify-between">
                                        <span className="text-xs text-slate-400 font-medium">Source Code</span>
                                        <span className="text-xs text-emerald-400 font-mono">
                                            Line {currentStep.line_number} • {currentStep.event}
                                        </span>
                                    </div>
                                    <div className="p-2 font-mono text-sm max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {sourceLines.map((line, idx) => {
                                            const lineNum = idx + 1;
                                            const isCurrent = lineNum === currentStep.line_number;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center px-2 py-0.5 rounded transition-all duration-200 ${
                                                        isCurrent
                                                            ? 'bg-emerald-500/15 border-l-2 border-emerald-400'
                                                            : 'border-l-2 border-transparent'
                                                    }`}
                                                >
                                                    <span className={`w-8 text-right mr-3 text-xs ${
                                                        isCurrent ? 'text-emerald-400 font-bold' : 'text-slate-600'
                                                    }`}>
                                                        {lineNum}
                                                    </span>
                                                    <span className={isCurrent ? 'text-emerald-200' : 'text-slate-400'}>
                                                        {line || ' '}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Variable visualizations */}
                                <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
                                    <h3 className="text-xs text-slate-400 font-medium mb-3 flex items-center gap-2">
                                        <Zap size={12} className="text-amber-400" />
                                        Variable State
                                    </h3>

                                    {/* Arrays with pointer detection */}
                                    {vizData.arrays.map(({ name, values }) => (
                                        <ArrayVisualization
                                            key={name}
                                            name={name}
                                            values={values}
                                            pointers={vizData.pointerCandidates}
                                        />
                                    ))}

                                    {/* Dicts */}
                                    {vizData.dicts.map(({ name, value }) => (
                                        <DictVisualization key={name} name={name} value={value} />
                                    ))}

                                    {/* Scalars */}
                                    <div className="flex flex-wrap">
                                        {vizData.scalars.map(({ name, value }) => (
                                            <ScalarVisualization key={name} name={name} value={value} />
                                        ))}
                                    </div>

                                    {Object.keys(currentStep.variables || {}).length === 0 && (
                                        <p className="text-xs text-slate-500 italic">No variables in scope</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANEL: Analysis ────────────────────── */}
                <div className="w-[280px] border-l border-slate-800/50 flex flex-col overflow-y-auto custom-scrollbar">
                    {/* Step info */}
                    {hasTrace && currentStep && (
                        <div className="p-4 border-b border-slate-800/50">
                            <h3 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
                                Current Step
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Step</span>
                                    <span className="text-white font-mono">{currentStep.step_number}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Line</span>
                                    <span className="text-white font-mono">{currentStep.line_number}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Event</span>
                                    <span className={`font-mono px-2 py-0.5 rounded text-xs ${
                                        currentStep.event === 'line' ? 'bg-sky-500/20 text-sky-300' :
                                        currentStep.event === 'call' ? 'bg-violet-500/20 text-violet-300' :
                                        currentStep.event === 'return' ? 'bg-emerald-500/20 text-emerald-300' :
                                        currentStep.event === 'exception' ? 'bg-red-500/20 text-red-300' :
                                        'bg-slate-700 text-slate-300'
                                    }`}>
                                        {currentStep.event}
                                    </span>
                                </div>
                                {currentStep.function_name && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Function</span>
                                        <span className="text-violet-300 font-mono">{currentStep.function_name}()</span>
                                    </div>
                                )}
                                {currentStep.return_value !== undefined && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Returns</span>
                                        <span className="text-emerald-300 font-mono">{JSON.stringify(currentStep.return_value)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Source line */}
                            <div className="mt-3 p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/30">
                                <code className="text-xs text-emerald-300 font-mono">
                                    {currentStep.source_line || '—'}
                                </code>
                            </div>
                        </div>
                    )}

                    {/* Complexity */}
                    {complexity && (
                        <div className="p-4 border-b border-slate-800/50">
                            <h3 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
                                Analysis
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 p-2.5 bg-sky-500/10 rounded-lg border border-sky-500/20">
                                    <Clock size={14} className="text-sky-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">Time Complexity</div>
                                        <div className="text-sm font-mono text-sky-300 font-bold">{complexity.time}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-violet-500/10 rounded-lg border border-violet-500/20">
                                    <HardDrive size={14} className="text-violet-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">Space Complexity</div>
                                        <div className="text-sm font-mono text-violet-300 font-bold">{complexity.space}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                    <Zap size={14} className="text-amber-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">Algorithm Pattern</div>
                                        <div className="text-sm font-mono text-amber-300 font-bold">{complexity.pattern}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Trace stats */}
                    {hasTrace && (
                        <div className="p-4 border-b border-slate-800/50">
                            <h3 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
                                Trace Statistics
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Steps</span>
                                    <span className="text-white font-mono">{traceSteps.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Source Lines</span>
                                    <span className="text-white font-mono">{sourceLines.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Final Variables</span>
                                    <span className="text-white font-mono">{Object.keys(finalVariables).length}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Final result */}
                    {hasTrace && Object.keys(finalVariables).length > 0 && (
                        <div className="p-4">
                            <h3 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle size={12} className="text-emerald-400" />
                                Final Result
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(finalVariables).map(([name, value]) => (
                                    <div key={name} className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/30">
                                        <span className="text-xs text-slate-400 font-mono">{name}</span>
                                        <div className="text-sm text-emerald-300 font-mono mt-1 break-all">
                                            {JSON.stringify(value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state for right panel */}
                    {!hasTrace && (
                        <div className="flex-1 flex items-center justify-center p-6">
                            <p className="text-xs text-slate-600 text-center">
                                Execute code to see step-by-step analysis
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodeVisualiser;
