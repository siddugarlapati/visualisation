import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Save, 
  Trash2, 
  Download, 
  Upload,
  RefreshCw,
  BookMarked,
  Plus,
  X
} from 'lucide-react';

/**
 * Dynamic Input Configuration Panel
 * Provides advanced controls for input customization
 */
const DynamicInputPanel = ({ 
  inputMode,
  onInputGenerated,
  currentText,
  sourceLang,
  targetLang 
}) => {
  // Configuration state
  const [complexity, setComplexity] = useState('medium');
  const [wordCount, setWordCount] = useState(8);
  const [topic, setTopic] = useState('general');
  const [customPresets, setCustomPresets] = useState([]);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Load custom presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nlp_custom_presets');
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load presets:', e);
      }
    }
  }, []);

  // Save presets to localStorage
  const savePresetsToStorage = (presets) => {
    localStorage.setItem('nlp_custom_presets', JSON.stringify(presets));
    setCustomPresets(presets);
  };

  // Generate input based on configuration
  const generateInput = () => {
    const templates = {
      simple: {
        general: [
          'The cat sleeps',
          'Birds fly high',
          'Water is cold',
          'Sun shines bright'
        ],
        technology: [
          'Computers process data',
          'Apps run on phones',
          'Code creates software'
        ],
        nature: [
          'Trees grow tall',
          'Rivers flow down',
          'Flowers bloom spring'
        ],
        daily: [
          'I eat breakfast',
          'We go shopping',
          'They play games'
        ]
      },
      medium: {
        general: [
          'The quick brown fox jumps over the lazy dog',
          'She sells seashells by the seashore every morning',
          'A journey of thousand miles begins with single step'
        ],
        technology: [
          'Artificial intelligence transforms how we interact with computers',
          'Cloud computing enables scalable and flexible infrastructure solutions',
          'Machine learning algorithms analyze patterns in large datasets'
        ],
        nature: [
          'The majestic mountains stand tall against the azure sky',
          'Colorful butterflies dance gracefully among blooming wildflowers',
          'Ocean waves crash rhythmically against the rocky shoreline'
        ],
        daily: [
          'Every morning I enjoy a fresh cup of coffee',
          'She carefully prepares delicious meals for her family',
          'They enthusiastically discuss their weekend adventure plans'
        ]
      },
      complex: {
        general: [
          'Despite the challenging circumstances, the resilient community members collaborated effectively to overcome numerous obstacles',
          'The intricate relationship between economic policies and social welfare requires comprehensive analysis and thoughtful consideration',
          'Throughout history, revolutionary innovations have fundamentally transformed the way societies organize and communicate'
        ],
        technology: [
          'Advanced neural networks leverage sophisticated architectures to achieve unprecedented accuracy in complex pattern recognition tasks',
          'Distributed systems architecture enables fault-tolerant, highly available applications across geographically dispersed data centers',
          'Quantum computing promises to revolutionize cryptography, optimization, and simulation through fundamentally different computational paradigms'
        ],
        nature: [
          'The delicate ecosystem maintains equilibrium through intricate interdependencies among diverse species and environmental factors',
          'Climate change manifests through increasingly frequent extreme weather events, rising temperatures, and shifting precipitation patterns',
          'Biodiversity conservation requires coordinated international efforts addressing habitat destruction, pollution, and unsustainable resource exploitation'
        ],
        daily: [
          'Balancing professional responsibilities with personal well-being necessitates deliberate prioritization and effective time management strategies',
          'Cultivating meaningful relationships demands consistent effort, genuine empathy, and willingness to navigate inevitable conflicts constructively',
          'Pursuing lifelong learning opportunities enriches personal growth while enhancing adaptability in rapidly evolving professional landscapes'
        ]
      }
    };

    const selectedTemplates = templates[complexity][topic];
    const randomTemplate = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];
    
    // Adjust to word count if needed
    let generated = randomTemplate;
    const words = generated.split(' ');
    
    if (words.length > wordCount) {
      generated = words.slice(0, wordCount).join(' ');
    } else if (words.length < wordCount) {
      // Repeat or extend if needed
      while (generated.split(' ').length < wordCount) {
        generated += ' ' + randomTemplate;
      }
      generated = generated.split(' ').slice(0, wordCount).join(' ');
    }

    onInputGenerated(generated);
  };

  // Save current configuration as preset
  const saveAsPreset = () => {
    if (!newPresetName.trim()) return;
    
    const newPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      text: currentText,
      complexity,
      wordCount,
      topic,
      sourceLang,
      targetLang,
      createdAt: new Date().toISOString()
    };

    const updated = [...customPresets, newPreset];
    savePresetsToStorage(updated);
    setNewPresetName('');
    setShowPresetManager(false);
  };

  // Load a preset
  const loadPreset = (preset) => {
    setComplexity(preset.complexity);
    setWordCount(preset.wordCount);
    setTopic(preset.topic);
    onInputGenerated(preset.text);
  };

  // Delete a preset
  const deletePreset = (presetId) => {
    const updated = customPresets.filter(p => p.id !== presetId);
    savePresetsToStorage(updated);
  };

  // Export presets
  const exportPresets = () => {
    const dataStr = JSON.stringify(customPresets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nlp-presets.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import presets
  const importPresets = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        const merged = [...customPresets, ...imported];
        savePresetsToStorage(merged);
      } catch (error) {
        console.error('Failed to import presets:', error);
        alert('Failed to import presets. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Only show for auto mode
  if (inputMode !== 'auto') {
    return null;
  }

  return (
    <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Sliders className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Input Configuration</h3>
      </div>

      {/* Complexity Selector */}
      <div>
        <label className="block text-xs font-medium text-white/60 mb-2">
          Sentence Complexity
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['simple', 'medium', 'complex'].map((level) => (
            <button
              key={level}
              onClick={() => setComplexity(level)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                complexity === level
                  ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Word Count Slider */}
      <div>
        <label className="block text-xs font-medium text-white/60 mb-2">
          Word Count: {wordCount}
        </label>
        <input
          type="range"
          min="3"
          max="30"
          value={wordCount}
          onChange={(e) => setWordCount(parseInt(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>3</span>
          <span>30</span>
        </div>
      </div>

      {/* Topic Selector */}
      <div>
        <label className="block text-xs font-medium text-white/60 mb-2">
          Topic/Domain
        </label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="general" className="bg-slate-900">General</option>
          <option value="technology" className="bg-slate-900">Technology</option>
          <option value="nature" className="bg-slate-900">Nature</option>
          <option value="daily" className="bg-slate-900">Daily Life</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateInput}
        className="w-full py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg font-medium text-white text-sm flex items-center justify-center gap-2 transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        Generate Input
      </button>

      {/* Preset Management */}
      <div className="pt-3 border-t border-white/10">
        <button
          onClick={() => setShowPresetManager(!showPresetManager)}
          className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/80 text-sm flex items-center justify-center gap-2 transition-all"
        >
          <BookMarked className="w-4 h-4" />
          {showPresetManager ? 'Hide' : 'Manage'} Custom Presets
        </button>

        {showPresetManager && (
          <div className="mt-3 space-y-3">
            {/* Save Current as Preset */}
            <div className="p-3 bg-black/20 rounded-lg space-y-2">
              <label className="block text-xs font-medium text-white/60">
                Save Current Configuration
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={saveAsPreset}
                  disabled={!newPresetName.trim()}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-all"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Custom Presets List */}
            {customPresets.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-white/60">
                  Your Presets ({customPresets.length})
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-all"
                    >
                      <button
                        onClick={() => loadPreset(preset)}
                        className="flex-1 text-left text-sm text-white/80 hover:text-white truncate"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import/Export */}
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={importPresets}
                  className="hidden"
                />
                <div className="py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 text-xs flex items-center justify-center gap-2 transition-all">
                  <Upload className="w-3 h-3" />
                  Import
                </div>
              </label>
              <button
                onClick={exportPresets}
                disabled={customPresets.length === 0}
                className="flex-1 py-2 px-3 bg-green-600/20 hover:bg-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed border border-green-500/30 rounded-lg text-green-300 text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicInputPanel;
