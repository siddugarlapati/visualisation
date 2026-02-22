import React, { useEffect, useRef, useState } from "react";
import {
  Languages,
  Play,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Pause,
  Loader2,
  Sparkles,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { NLPEngine } from "../engine/NLPEngine";
import { initBackground, updateBackground } from "../engine/nlp_background";
import InputModeSelector from "../components/InputModeSelector";
import DynamicInputPanel from "../components/DynamicInputPanel";
import InputHistory from "../components/InputHistory";
import BatchInput from "../components/BatchInput";

// Preset example sentences
const PRESET_EXAMPLES = [
  { id: 'simple', label: 'Simple Sentence', text: 'The cats are running quickly' },
  { id: 'complex', label: 'Complex Sentence', text: 'The quick brown fox jumps over the lazy dog near the river' },
  { id: 'question', label: 'Question', text: 'Where are you going today?' },
  { id: 'technical', label: 'Technical', text: 'Machine learning algorithms process data efficiently' },
  { id: 'idiom', label: 'Idiomatic', text: 'It is raining cats and dogs outside' },
];

// Supported languages
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
  // Indian Languages (all supported by Google Translate)
  { code: "hi", name: "Hindi 🇮🇳" },
  { code: "ta", name: "Tamil 🇮🇳" },
  { code: "te", name: "Telugu 🇮🇳" },
  { code: "bn", name: "Bengali 🇮🇳" },
  { code: "mr", name: "Marathi 🇮🇳" },
  { code: "kn", name: "Kannada 🇮🇳" },
  { code: "ml", name: "Malayalam 🇮🇳" },
  { code: "gu", name: "Gujarati 🇮🇳" },
  { code: "pa", name: "Punjabi 🇮🇳" },
  { code: "or", name: "Odia 🇮🇳" },
];

// Stage descriptions
const STAGE_DESCRIPTIONS = {
  normalization: {
    title: "Normalization",
    description:
      "Clean and standardize the input: lowercasing, trimming, and punctuation handling.",
    color: "#06b6d4",
  },
  tokenization: {
    title: "Tokenization",
    description: "Breaking the sentence into individual words or tokens.",
    color: "#3b82f6",
  },
  stopwords: {
    title: "Stopword Detection",
    description:
      "Identify common words (like 'the', 'is') that may not affect meaning.",
    color: "#9ca3af",
  },
  stemming: {
    title: "Stemming / Lemmatization",
    description:
      "Reducing words to their root form by removing prefixes and suffixes.",
    color: "#22c55e",
  },
  vocabulary: {
    title: "Vocabulary Lookup",
    description: "Check each root against a simple dictionary or vocabulary store.",
    color: "#f472b6",
  },
  mapping: {
    title: "Translation Mapping",
    description: "Map source words to target-language equivalents.",
    color: "#22c55e",
  },
  translation: {
    title: "Translation",
    description: "Converting root words from source to target language.",
    color: "#a855f7",
  },
  grammar: {
    title: "Grammar Reconstruction",
    description: "Arrange translated words to fit target-language grammar.",
    color: "#f59e0b",
  },
  reconstruction: {
    title: "Reconstruction",
    description:
      "Combining translated roots into a grammatically correct sentence.",
    color: "#fbbf24",
  },
};

function setupScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);

  const camera = new THREE.PerspectiveCamera(
    60,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 0, 18);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const controls = new OrbitControls(camera, renderer.domElement);

  // CRITICAL: Enable smooth zoom to cursor
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  // Enable all controls
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;

  // Screen-space panning (moves parallel to screen, not object)
  controls.screenSpacePanning = true;

  // Control speeds
  controls.panSpeed = 2.0; // Faster panning
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.5; // Faster zoom

  // Allow very close zoom for reading text
  controls.minDistance = 1; // Can zoom very close
  controls.maxDistance = 80;

  // No polar angle restrictions - can rotate freely
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  // Mouse button configuration
  // LEFT = Rotate, RIGHT = Pan, SCROLL = Zoom
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN, // Middle click to pan too
    RIGHT: THREE.MOUSE.PAN,
  };

  // Touch controls for mobile
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Brighter ambient
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(10, 20, 15);
  mainLight.castShadow = true;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x8b5cf6, 0.4);
  fillLight.position.set(-15, 10, -10);
  scene.add(fillLight);

  // Extra front light for text visibility
  const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
  frontLight.position.set(0, 0, 20);
  scene.add(frontLight);

  // Background
  const bgObjects = initBackground(scene);

  return { scene, camera, renderer, controls, bgObjects };
}

const NLPVisualiser = () => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [inputText, setInputText] = useState("The cats are running quickly");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [inputMode, setInputMode] = useState('custom'); // 'custom' | 'auto' | 'preset'
  const [selectedPreset, setSelectedPreset] = useState('simple');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [translatedText, setTranslatedText] = useState("");

  const playIntervalRef = useRef(null);
  const isPausedRef = useRef(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1 = normal, 0.5 = slow, 2 = fast
  const [batchQueue, setBatchQueue] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(-1);

  // Map backend stage names to our canonical keys
  const normalizeStageName = (name) => {
    if (!name) return null;
    const n = String(name).toLowerCase();
    if (["normalize", "normalization"].includes(n)) return "normalization";
    if (["tokenize", "tokenization", "tokens"].includes(n)) return "tokenization";
    if (["stopword", "stopwords", "stopword_detection"].includes(n)) return "stopwords";
    if (["stem", "stemming", "lemmatization", "lemmatise", "lemmatize", "stems"].includes(n)) return "stemming";
    if (["vocab", "vocabulary", "vocabulary_lookup"].includes(n)) return "vocabulary";
    if (["mapping", "translation_mapping"].includes(n)) return "mapping";
    if (["translate", "translation", "translated"].includes(n)) return "translation";
    if (["grammar", "grammar_reconstruction"].includes(n)) return "grammar";
    if (["reconstruction", "output", "final"].includes(n)) return "reconstruction";
    return n;
  };

  // Lightweight parser helpers to extract arguments from code strings we control
  const extractFirstQuoted = (str) => {
    const m = str.match(/"([^"]+)"|\'([^\']+)\'/);
    return m ? (m[1] || m[2]) : null;
  };

  const extractArrayOfQuoted = (str) => {
    const arrMatch = str.match(/\[(.*?)\]/s);
    if (!arrMatch) return [];
    const inner = arrMatch[1];
    const re = /"([^"]+)"|\'([^\']+)\'/g;
    const out = [];
    let m;
    while ((m = re.exec(inner)) !== null) out.push(m[1] || m[2]);
    return out;
  };

  // Expand minimal backend steps into a fuller educational pipeline
  const expandStepsIfNeeded = (origSteps, input) => {
    if (!Array.isArray(origSteps) || origSteps.length === 0) return origSteps;

    const stepsOut = [];
    let sentenceIdFromTokenize = null;
    let tokenIds = [];
    let tokens = [];

    // Find the first splitSentence to anchor IDs and tokens
    for (const s of origSteps) {
      if (s?.code?.startsWith("viz.splitSentence")) {
        const inside = s.code.substring(s.code.indexOf("(") + 1, s.code.lastIndexOf(")"));
        const parts = inside.split(/,(.*)/s); // first arg, rest
        sentenceIdFromTokenize = extractFirstQuoted(parts[0]) || "sentence_1";
        const rest = parts[1] || "";
        // Expect two arrays: tokenIds, tokens
        const arrs = rest.match(/\[(.*?)\]/gs) || [];
        if (arrs[0]) tokenIds = extractArrayOfQuoted(arrs[0]);
        if (arrs[1]) tokens = extractArrayOfQuoted(arrs[1]);
        break;
      }
    }

    // Build normalization step (if not already present)
    const hasNormalization = origSteps.some(s => normalizeStageName(s.stage) === "normalization");
    if (!hasNormalization && sentenceIdFromTokenize && input) {
      const normalized = input.toLowerCase().trim();
      stepsOut.push({
        stage: "normalization",
        title: "Normalization",
        code: `viz.normalizeText("${sentenceIdFromTokenize}", ${JSON.stringify(normalized)})`,
      });
    }

    const stopwordSet = new Set(["the","is","are","a","an","and","or","but","to","of","in","on","for","with","as","by","at"]);
    let injectedStopwords = false;
    let injectedVocab = false;
    let injectedMapping = false;
    let injectedGrammar = false;

    for (const step of origSteps) {
      const stageKey = normalizeStageName(step.stage);
      // Keep original step
      stepsOut.push(step);

      // Insert Stopwords right after tokenization if we have tokens
      if (!injectedStopwords && stageKey === "tokenization" && tokenIds.length && tokens.length) {
        tokenIds.forEach((tid, idx) => {
          const word = tokens[idx] || "";
          const isStop = stopwordSet.has(word.toLowerCase());
          stepsOut.push({
            stage: "stopwords",
            title: "Stopword Detection",
            code: `viz.detectStopword(${JSON.stringify(tid)}, ${isStop})`,
          });
        });
        injectedStopwords = true;
      }

      // Insert Vocabulary hints after stemming if present
      if (!injectedVocab && stageKey === "stemming" && tokenIds.length) {
        tokenIds.forEach((tid, idx) => {
          const hint = `${(tokens[idx] || "").toLowerCase()} → entry`;
          stepsOut.push({
            stage: "vocabulary",
            title: "Vocabulary Lookup",
            code: `viz.vocabLookup(${JSON.stringify(tid)}, ${JSON.stringify(hint)})`,
          });
        });
        injectedVocab = true;
      }

      // Insert Mapping notes just before translation row shows up
      if (!injectedMapping && stageKey === "translation" && tokenIds.length) {
        tokenIds.forEach((tid, idx) => {
          const hint = `${tokens[idx] || ""} → …`;
          stepsOut.push({
            stage: "mapping",
            title: "Translation Mapping",
            code: `viz.mapTranslation(${JSON.stringify(tid)}, ${JSON.stringify(hint)})`,
          });
        });
        injectedMapping = true;
      }

      // Insert Grammar step before reconstruction/final output
      if (!injectedGrammar && (stageKey === "reconstruction")) {
        stepsOut.push({
          stage: "grammar",
          title: "Grammar Reconstruction",
          code: `viz.grammarReconstruct(${JSON.stringify(sentenceIdFromTokenize || "sentence_1")}, ${JSON.stringify("Reorder words to target grammar")})`,
        });
        injectedGrammar = true;
      }
    }

    return stepsOut;
  };

  // Calculate delay based on stage complexity - LONGER for educational viewing
  const getStageDelay = (stage) => {
    const s = normalizeStageName(stage);
    const baseDelays = {
      normalization: 3500, // gentle crossfade
      tokenization: 5000, // 5 seconds - time to see all tokens appear
      stopwords: 3000, // highlight muted tokens
      stemming: 4000, // 4 seconds - watch each word transform
      vocabulary: 3000, // small dictionary hints
      mapping: 3000, // mapping notes per token
      translation: 4500, // 4.5 seconds - see translations flip
      grammar: 3500, // grammar note
      reconstruction: 5500, // 5.5 seconds - watch merge + celebration
    };
    return (baseDelays[s] || 4000) / playbackSpeed;
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const { scene, camera, renderer, controls, bgObjects } = setupScene(
      canvasRef.current,
    );

    const engine = new NLPEngine(scene, camera, controls, bgObjects);
    engineRef.current = engine;

    // Reset camera to initial position
    engine.resetCamera();

    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      updateBackground(bgObjects, 0.001);
      engine.tick();
      renderer.render(scene, camera);
    }

    function handleResize() {
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      engine.dispose();
      renderer.dispose();
    };
  }, []);

  // Generate visualization
  const handleVisualize = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to visualize");
      return;
    }

    setLoading(true);
    setError(null);
    setSteps([]);
    setCurrentStep(-1);
    setCurrentStage(null);
    setTranslatedText("");

    if (engineRef.current) {
      engineRef.current.clearNLP();
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

      // Add timeout for long model downloads (5 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout

      console.log("🔄 Sending translation request...");

      const response = await fetch(`${API_URL}/nlp-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Received response:", data);

      if (data.steps && data.steps.length > 0) {
        const expanded = expandStepsIfNeeded(data.steps, inputText);
        setSteps(expanded);
        // Don't auto-execute step 0 - wait for user to press play
        setCurrentStep(-1);  // -1 means "ready to start, waiting for play"

        // Show a waiting placeholder in the scene
        if (engineRef.current) {
          engineRef.current.showWaitingState(inputText);
        }

        // Extract translated text from metadata or last step
        const finalTranslation =
          data.metadata?.translated_text ||
          data.steps[data.steps.length - 1]?.final_sentence ||
          "";
        setTranslatedText(finalTranslation);
      } else {
        setError("No visualization steps generated");
      }
    } catch (err) {
      console.error("Visualization error:", err);
      if (err.name === "AbortError") {
        setError(
          "Request timed out. The model may still be downloading. Please try again.",
        );
      } else {
        setError(
          err.message ||
            "Failed to generate visualization. Is the backend running?",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle batch processing
  const handleBatchProcess = async (sentences) => {
    setBatchQueue(sentences);
    setCurrentBatchIndex(0);
    // Process first sentence
    setInputText(sentences[0]);
    // Auto-visualize after a short delay
    setTimeout(() => {
      handleVisualize();
    }, 500);
  };

  // Auto-process next batch item when current completes
  useEffect(() => {
    if (batchQueue.length > 0 && currentBatchIndex >= 0 && currentBatchIndex < batchQueue.length - 1) {
      // Check if current visualization is complete (all steps played)
      if (currentStep >= steps.length - 1 && !isPlaying && steps.length > 0) {
        // Wait a bit, then move to next
        const timer = setTimeout(() => {
          const nextIndex = currentBatchIndex + 1;
          setCurrentBatchIndex(nextIndex);
          setInputText(batchQueue[nextIndex]);
          setTimeout(() => {
            handleVisualize();
          }, 1000);
        }, 3000); // 3 second pause between batch items
        return () => clearTimeout(timer);
      }
    }
  }, [currentStep, steps.length, isPlaying, batchQueue, currentBatchIndex]);

  // Execute step visualization with improved logging
  const handleStepChange = (index, stepsArr = steps) => {
    if (index < 0 || index >= stepsArr.length) return;

    const step = stepsArr[index];
    setCurrentStep(index);
    setCurrentStage(normalizeStageName(step.stage) || null);

    console.log(
      `\n📍 Step ${index + 1}/${stepsArr.length}: ${step.title || step.stage}`,
    );
    console.log(`   Stage: ${step.stage}`);
    console.log(`   Code: ${step.code?.substring(0, 100)}...`);

    const engine = engineRef.current;
    if (!engine) {
      console.error("Engine not initialized!");
      return;
    }

    // Highlight the current stage in the pipeline
    if (step.stage) {
      engine.highlightStage(step.stage);
    }

    // Execute the visualization code
    if (step.code) {
      try {
        engine.executeNLP(step.code);
      } catch (err) {
        console.error("Step execution error:", err);
        // Try to continue anyway
      }
    } else {
      console.warn("No code for this step");
    }
  };

  // Playback controls with stage-aware timing
  const handlePlay = () => {
    if (steps.length === 0) return;

    // If already playing, pause
    if (isPlaying) {
      setIsPlaying(false);
      isPausedRef.current = true;
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }

    // Start playing
    setIsPlaying(true);
    isPausedRef.current = false;

    // Clear waiting state if starting fresh
    if (currentStep === -1 && engineRef.current) {
      engineRef.current.clearWaitingState();
    }

    // If at end, restart from beginning
    if (currentStep >= steps.length - 1 && engineRef.current) {
      engineRef.current.clearNLP();
      setCurrentStep(-1);
    }

    // Determine starting step
    const startIndex = currentStep === -1 ? 0 : currentStep + 1;

    // Play steps sequentially with delays
    const playStep = (stepIndex) => {
      if (isPausedRef.current || stepIndex >= steps.length) {
        setIsPlaying(false);
        console.log("✅ Playback complete!");
        return;
      }

      // Execute this step
      handleStepChange(stepIndex);
      console.log(`▶ Playing Step ${stepIndex + 1} of ${steps.length}`);

      // Schedule next step with delay based on stage
      const currentStage = steps[stepIndex]?.stage;
      const delay = getStageDelay(currentStage);

      playIntervalRef.current = setTimeout(() => {
        if (!isPausedRef.current) {
          playStep(stepIndex + 1);
        }
      }, delay);
    };

    // Start playing from startIndex
    playStep(startIndex);
  };

  const handleReset = () => {
    setIsPlaying(false);
    isPausedRef.current = true;
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    setCurrentStep(-1);
    setCurrentStage(null);

    if (engineRef.current) {
      engineRef.current.clearNLP();
      engineRef.current.resetCamera();
    }
  };

  const handlePrev = () => {
    // For prev, we need to rebuild from scratch up to that step
    // For now, just go to previous step (won't show correct state)
    if (currentStep > 0) {
      console.log("⚠️ Previous step - visualization state may be incorrect");
      handleStepChange(currentStep - 1);
    }
  };

  const handleNext = () => {
    // Same as handlePlay - advance one step
    handlePlay();
  };

  return (
    <div className="h-screen bg-gradient-to-br from-white via-gray-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 backdrop-blur-xl bg-white/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Languages className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1E3A5F]">
                NLP Translation Visualizer
              </h1>
              <p className="text-sm text-gray-600">
                Visualize how NLP translation works step-by-step
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 p-4 border-r border-gray-200 bg-white/80 backdrop-blur-xl overflow-y-auto">
          <div className="space-y-4">
            {/* Input Mode Selector */}
            <InputModeSelector 
              mode={inputMode}
              onChange={(newMode) => {
                setInputMode(newMode);
                // Auto-populate based on mode
                if (newMode === 'preset') {
                  const preset = PRESET_EXAMPLES.find(p => p.id === selectedPreset);
                  if (preset) setInputText(preset.text);
                } else if (newMode === 'auto') {
                  // Keep current text, backend will generate if needed
                }
              }}
              showPresets={true}
            />

            {/* Preset Selection (only visible in preset mode) */}
            {inputMode === 'preset' && (
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">
                  Select Example
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => {
                    setSelectedPreset(e.target.value);
                    const preset = PRESET_EXAMPLES.find(p => p.id === e.target.value);
                    if (preset) setInputText(preset.text);
                  }}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  {PRESET_EXAMPLES.map((preset) => (
                    <option
                      key={preset.id}
                      value={preset.id}
                      className="bg-slate-900"
                    >
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic Input Panel - shows for auto mode */}
            <DynamicInputPanel
              inputMode={inputMode}
              onInputGenerated={setInputText}
              currentText={inputText}
              sourceLang={sourceLang}
              targetLang={targetLang}
            />

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Input Text
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to translate..."
                disabled={inputMode === 'preset'}
                className={`w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none ${inputMode === 'preset' ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">
                  From
                </label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  {LANGUAGES.map((lang) => (
                    <option
                      key={lang.code}
                      value={lang.code}
                      className="bg-slate-900"
                    >
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">
                  To
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  {LANGUAGES.filter((l) => l.code !== sourceLang).map(
                    (lang) => (
                      <option
                        key={lang.code}
                        value={lang.code}
                        className="bg-slate-900"
                      >
                        {lang.name}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <button
              onClick={handleVisualize}
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Visualize Translation
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Translation Result Display */}
            {translatedText && (
              <div className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/40 rounded-xl">
                <div className="text-xs font-medium text-green-400 mb-2 uppercase tracking-wider">
                  Translation Result
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-white/50 mb-1">
                      Original (
                      {LANGUAGES.find((l) => l.code === sourceLang)?.name}):
                    </div>
                    <div className="text-white/80 font-medium">{inputText}</div>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-xs text-white/50 mb-1">
                      Translated (
                      {LANGUAGES.find((l) => l.code === targetLang)?.name}):
                    </div>
                    <div className="text-lg text-green-300 font-bold">
                      {translatedText}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input History */}
            <InputHistory
              onSelectHistory={setInputText}
              currentText={inputText}
            />

            {/* Batch Input */}
            <BatchInput
              onBatchProcess={handleBatchProcess}
              isVisible={inputMode === 'custom'}
            />

            {/* Batch Progress Indicator */}
            {batchQueue.length > 0 && (
              <div className="p-3 bg-blue-500/20 border border-blue-500/40 rounded-xl">
                <div className="text-xs font-medium text-blue-400 mb-2">
                  Batch Processing
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${((currentBatchIndex + 1) / batchQueue.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-blue-300">
                    {currentBatchIndex + 1} / {batchQueue.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stage Explanation */}
          {currentStage && STAGE_DESCRIPTIONS[currentStage] && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div
                className="text-lg font-bold mb-2"
                style={{ color: STAGE_DESCRIPTIONS[currentStage].color }}
              >
                {STAGE_DESCRIPTIONS[currentStage].title}
              </div>
              <p className="text-sm text-white/70">
                {STAGE_DESCRIPTIONS[currentStage].description}
              </p>
            </div>
          )}

          {/* Steps List */}
          {steps.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-white/60 mb-3">Steps</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => handleStepChange(index)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      index === currentStep
                        ? "bg-purple-600/30 border border-purple-500/50"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === currentStep
                            ? "bg-purple-500 text-white"
                            : "bg-white/20 text-white/60"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm text-white/80 truncate">
                        {step.title || `Step ${index + 1}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <canvas ref={canvasRef} className="w-full h-full" />

          {/* Current Stage Overlay */}
          {currentStage && STAGE_DESCRIPTIONS[currentStage] && (
            <div className="absolute top-6 left-6 px-4 py-3 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 max-w-sm">
              <div className="flex items-start gap-3">
                <div
                  className="w-2 h-10 rounded"
                  style={{ backgroundColor: STAGE_DESCRIPTIONS[currentStage].color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-white/70" />
                    <h4 className="text-white font-semibold text-sm">
                      {STAGE_DESCRIPTIONS[currentStage].title}
                    </h4>
                  </div>
                  <p className="text-white/70 text-xs mt-1 leading-snug">
                    {STAGE_DESCRIPTIONS[currentStage].description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Playback Controls */}
          {steps.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrev}
                disabled={currentStep <= 0}
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 disabled:opacity-30 transition-colors"
                title="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handlePlay}
                className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleNext}
                disabled={currentStep >= steps.length - 1}
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 disabled:opacity-30 transition-colors"
                title="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="px-3 text-sm text-white/60">
                {currentStep + 1} / {steps.length}
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <div>
                  <p className="text-white/90 font-medium">
                    Translating with MarianMT...
                  </p>
                  <p className="text-white/50 text-sm mt-2">
                    First translation downloads the model (~300MB).
                    <br />
                    This may take 1-2 minutes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NLPVisualiser;
