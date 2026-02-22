/**
 * NLPEngine.js - Educational NLP Visualization Engine
 * 
 * DESIGNED FOR STUDENTS:
 * - Large, clear text that's easy to read
 * - Step-by-step progression with visual indicators
 * - Clear flowchart layout with labeled stages
 * - Shows actual translated words
 */

import * as THREE from 'three';
import gsap from 'gsap';

// Polyfill for roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

// Stage colors - bright and distinct
const COLORS = {
    input: 0x6366f1,          // Indigo
    tokenization: 0x3b82f6,   // Blue
    stemming: 0x10b981,       // Emerald
    translation: 0x8b5cf6,    // Purple
    reconstruction: 0xf59e0b, // Amber
    normalization: 0x06b6d4,  // Cyan
    stopword: 0x9ca3af,       // Gray
    vocabulary: 0xf472b6,     // Pink
    mapping: 0x22c55e,        // Green
    grammar: 0xf59e0b         // Amber (reuse)
};

// Y positions for flowchart rows (well spaced)
const ROW_Y = {
    input: 10,
    normalize: 7.5,
    tokens: 4.5,
    stopwords: 2,
    stems: 0,
    vocabulary: -2.5,
    translated: -5,
    grammar: -7.5,
    final: -10
};

export class NLPEngine {
    constructor(scene, camera, controls, bgObjects) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.bgObjects = bgObjects;
        this.objects = {};

        this.state = {
            tokenIds: [],
            tokenTexts: [],
            labels: [],
            connectors: [],
            createdRows: new Set()
        };
    }

    tick() { }

    dispose() {
        Object.values(this.objects).forEach(obj => {
            if (obj) {
                this.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (obj.material.map) obj.material.map.dispose();
                    obj.material.dispose();
                }
            }
        });
        this.state.labels.forEach(l => {
            this.scene.remove(l);
            if (l.material) {
                if (l.material.map) l.material.map.dispose();
                l.material.dispose();
            }
        });
        this.state.connectors.forEach(c => {
            this.scene.remove(c);
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        this.objects = {};
        this.state = { tokenIds: [], tokenTexts: [], labels: [], connectors: [], createdRows: new Set() };
    }

    // ═══════════════════════════════════════════════════════════════════
    // CAMERA - Positioned for clear viewing
    // ═══════════════════════════════════════════════════════════════════

    focusCamera(y, duration = 1.0) {
        if (!this.camera || !this.controls) return;
        // Bring camera even closer for readability while keeping smooth motion
        gsap.to(this.camera.position, { x: 0, y: y, z: 14, duration, ease: 'power2.inOut' });
        gsap.to(this.controls.target, { x: 0, y: y, z: 0, duration, ease: 'power2.inOut' });
    }

    resetCamera() {
        if (this.camera && this.controls) {
            // Closer default for readability
            gsap.to(this.camera.position, { x: 0, y: 0, z: 16, duration: 1, ease: 'power2.inOut' });
            gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut' });
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // WAITING STATE - Shows empty container before play
    // ═══════════════════════════════════════════════════════════════════

    showWaitingState(inputText) {
        // Clear any existing waiting state
        this.clearWaitingState();

        // Create a container showing the input text, ready to be processed
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 200;

        // Dark container background
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 20);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 20);
        ctx.stroke();

        // "Ready to visualize:" title
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('Ready to visualize:', canvas.width / 2, 55);

        // Input text
        const displayText = inputText.length > 40 ? inputText.substring(0, 37) + '...' : inputText;
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`"${displayText}"`, canvas.width / 2, 105);

        // "Press Play to start" instruction
        ctx.font = '24px Arial';
        ctx.fillStyle = '#22c55e';
        ctx.fillText('▶ Press Play to start', canvas.width / 2, 160);

        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        }));
        sprite.position.set(0, 0, 0);
        sprite.scale.set(12, 3, 1);
        sprite.renderOrder = 1000;

        // Store for cleanup
        this.waitingSprite = sprite;
        this.scene.add(sprite);

        // Gentle pulse animation
        gsap.to(sprite.scale, {
            x: 12.3, y: 3.1,
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut'
        });
    }

    clearWaitingState() {
        if (this.waitingSprite) {
            gsap.killTweensOf(this.waitingSprite.scale);
            this.scene.remove(this.waitingSprite);
            if (this.waitingSprite.material.map) {
                this.waitingSprite.material.map.dispose();
            }
            this.waitingSprite.material.dispose();
            this.waitingSprite = null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMMAND PARSER
    // ═══════════════════════════════════════════════════════════════════

    executeNLP(codeString) {
        if (!codeString) return;
        console.log('📚 Executing:', codeString.substring(0, 80) + '...');

        const commands = [];
        const regex = /viz\.(\w+)\s*\(/g;
        let match;

        while ((match = regex.exec(codeString)) !== null) {
            const method = match[1];
            const start = match.index + match[0].length;
            let depth = 1, i = start, inStr = false, strChar = '';

            while (i < codeString.length && depth > 0) {
                const c = codeString[i], prev = codeString[i - 1] || '';
                if (!inStr && (c === '"' || c === "'")) { inStr = true; strChar = c; }
                else if (inStr && c === strChar && prev !== '\\') { inStr = false; }
                else if (!inStr) { if (c === '(') depth++; else if (c === ')') depth--; }
                i++;
            }

            if (depth === 0) {
                const argsStr = codeString.substring(start, i - 1);
                commands.push({ method, args: this._parseArgs(argsStr) });
            }
        }

        commands.forEach((cmd, idx) => {
            setTimeout(() => {
                if (typeof this[cmd.method] === 'function') {
                    console.log(`  ▶ ${cmd.method}()`);
                    this[cmd.method](...cmd.args);
                }
            }, idx * 500);  // Slower for students to follow
        });
    }

    _parseArgs(str) {
        if (!str.trim()) return [];
        const args = [];
        let current = '', inStr = false, strChar = '', depth = 0;

        for (const c of str) {
            if (!inStr && (c === '"' || c === "'")) { inStr = true; strChar = c; current += c; }
            else if (inStr && c === strChar) { inStr = false; current += c; }
            else if (!inStr && (c === '[' || c === '{')) { depth++; current += c; }
            else if (!inStr && (c === ']' || c === '}')) { depth--; current += c; }
            else if (!inStr && depth === 0 && c === ',') { args.push(this._parseVal(current.trim())); current = ''; }
            else { current += c; }
        }
        if (current.trim()) args.push(this._parseVal(current.trim()));
        return args;
    }

    _parseVal(v) {
        if (!v) return undefined;
        if ((v[0] === '"' && v.slice(-1) === '"') || (v[0] === "'" && v.slice(-1) === "'")) return v.slice(1, -1);
        if (!isNaN(v) && v !== '') return parseFloat(v);
        if (v === 'true') return true;
        if (v === 'false') return false;
        if (v[0] === '[' || v[0] === '{') { try { return JSON.parse(v.replace(/'/g, '"')); } catch { return v; } }
        return v;
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEXT RENDERING - LARGE AND CLEAR FOR STUDENTS
    // ═══════════════════════════════════════════════════════════════════

    _createTextBlock(text, color, scale = 1) {
        const textStr = String(text);
        const textLen = textStr.length;

        // Size based on text length - but minimum size for readability
        const baseWidth = 3;
        const width = Math.max(baseWidth, textLen * 0.4) * scale;
        const height = 1.5 * scale;

        // Create 3D box
        const geometry = new THREE.BoxGeometry(width, height, 0.4);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.15,
            roughness: 0.6,
            transparent: true,
            opacity: 0.95
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Create LARGE text canvas for clarity
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 256;

        // Dark background for contrast
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 16);
        ctx.fill();

        // Large, bold white text
        const fontSize = Math.min(90, Math.floor(900 / Math.max(textLen, 3)));
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // White text with shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(textStr, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(width * 1.2, height * 0.85, 1);
        sprite.position.z = 0.3;
        sprite.renderOrder = 999;

        mesh.add(sprite);
        return mesh;
    }

    _createStageLabel(text, y, bgColor, stepNumber) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 100;

        // Colored background
        ctx.fillStyle = bgColor;
        ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 12);
        ctx.fill();

        // White text with step number
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Step ${stepNumber}: ${text}`, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.position.set(-14, y, 0);
        sprite.scale.set(5, 1.25, 1);
        sprite.renderOrder = 1000;

        this.scene.add(sprite);
        this.state.labels.push(sprite);

        sprite.material.opacity = 0;
        gsap.to(sprite.material, { opacity: 1, duration: 0.5 });
    }

    _createArrow(fromY, toY) {
        const length = Math.abs(fromY - toY) - 2;

        // Vertical line
        const lineGeom = new THREE.CylinderGeometry(0.08, 0.08, length, 8);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
        const line = new THREE.Mesh(lineGeom, lineMat);
        line.position.set(0, (fromY + toY) / 2, -0.5);

        // Arrow head
        const arrowGeom = new THREE.ConeGeometry(0.3, 0.6, 8);
        const arrow = new THREE.Mesh(arrowGeom, lineMat.clone());
        arrow.position.set(0, toY + 1, -0.5);
        arrow.rotation.x = Math.PI;

        this.scene.add(line, arrow);
        this.state.connectors.push(line, arrow);
    }

    // ═══════════════════════════════════════════════════════════════════
    // VISUALIZATION METHODS - STEP BY STEP
    // ═══════════════════════════════════════════════════════════════════

    createTextBlock(id, text, x, y, options = {}) {
        if (!this.state.createdRows.has('input')) {
            this._createStageLabel('INPUT', ROW_Y.input, 'rgba(99, 102, 241, 0.9)', 1);
            this.state.createdRows.add('input');
        }

        const mesh = this._createTextBlock(text, COLORS.input, 1.4);
        mesh.position.set(0, ROW_Y.input, 0);

        this.scene.add(mesh);
        this.objects[id] = mesh;

        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.5)' });

        this.focusCamera(ROW_Y.input);
        return mesh;
    }

    splitSentence(sentenceId, tokenIds, tokens) {
        const tokenArr = Array.isArray(tokens) ? tokens : [tokens];
        const idArr = Array.isArray(tokenIds) ? tokenIds : [tokenIds];

        this.state.tokenIds = idArr;
        this.state.tokenTexts = tokenArr;

        if (!this.state.createdRows.has('tokens')) {
            this._createStageLabel('TOKENIZE', ROW_Y.tokens, 'rgba(59, 130, 246, 0.9)', 3);
            // Arrow from Normalize if present, otherwise from Input
            const fromY = this.state.createdRows.has('normalize') ? ROW_Y.normalize : ROW_Y.input;
            this._createArrow(fromY - 0.8, ROW_Y.tokens + 0.8);
            this.state.createdRows.add('tokens');
        }

        // Fade original
        const sentence = this.objects[sentenceId];
        if (sentence) gsap.to(sentence.material, { opacity: 0.25, duration: 0.5 });

        // Calculate positions
        const spacing = 4.0;
        const startX = -(tokenArr.length - 1) * spacing / 2;

        tokenArr.forEach((tok, i) => {
            setTimeout(() => {
                const mesh = this._createTextBlock(tok, COLORS.tokenization);
                mesh.position.set(startX + i * spacing, ROW_Y.tokens, 0);

                this.scene.add(mesh);
                this.objects[idArr[i]] = mesh;

                mesh.scale.set(0, 0, 0);
                gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.5)' });
            }, i * 400);
        });

        setTimeout(() => this.focusCamera(ROW_Y.tokens), tokenArr.length * 400 + 300);
    }

    // ═══════════════════════════════════════════════════════════════════
    // NEW STAGES (granularity upgrades)
    // ═══════════════════════════════════════════════════════════════════

    // 1) Normalization: lowercasing, trimming, punctuation clean-up (visual only)
    normalizeText(sentenceId, normalizedText) {
        if (!this.state.createdRows.has('normalize')) {
            this._createStageLabel('NORMALIZE', ROW_Y.normalize, 'rgba(6, 182, 212, 0.9)', 2);
            this._createArrow(ROW_Y.input - 0.8, ROW_Y.normalize + 0.8);
            this.state.createdRows.add('normalize');
        }

        const original = this.objects[sentenceId];
        if (original) {
            // Create a new normalized text block above tokens
            const mesh = this._createTextBlock(normalizedText, COLORS.normalization, 1.0);
            mesh.position.set(0, ROW_Y.normalize, 0);
            this.scene.add(mesh);
            this.objects[`${sentenceId}_norm`] = mesh;

            // Crossfade from original to normalized for clarity
            gsap.to(original.material, { opacity: 0.35, duration: 0.6 });
            mesh.material.opacity = 0;
            gsap.to(mesh.material, { opacity: 1, duration: 0.6 });

            this.focusCamera(ROW_Y.normalize);
        }
    }

    // 2) Stopword Detection: visually mute detected tokens
    detectStopword(tokenId, isStop = true) {
        if (!this.state.createdRows.has('stopwords')) {
            this._createStageLabel('STOPWORDS', ROW_Y.stopwords, 'rgba(156, 163, 175, 0.9)', 4);
            this._createArrow(ROW_Y.tokens - 0.8, ROW_Y.stopwords + 0.8);
            this.state.createdRows.add('stopwords');
        }

        const obj = this.objects[tokenId];
        if (obj) {
            const toOpacity = isStop ? 0.25 : 1.0;
            const toColor = isStop ? new THREE.Color(COLORS.stopword) : new THREE.Color(COLORS.tokenization);
            gsap.to(obj.material.color, { r: toColor.r, g: toColor.g, b: toColor.b, duration: 0.4 });
            gsap.to(obj.material, { opacity: toOpacity, duration: 0.6 });

            // Add a small badge above the token for clarity
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 220; canvas.height = 70;
            ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
            ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 10);
            ctx.fill();
            ctx.font = 'bold 26px Arial';
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isStop ? 'stopword' : 'keep', canvas.width / 2, canvas.height / 2);
            const texture = new THREE.CanvasTexture(canvas);
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
            sprite.scale.set(2.2, 0.7, 1);
            sprite.position.set(obj.position.x, ROW_Y.stopwords, 0);
            this.scene.add(sprite);
            this.state.labels.push(sprite);

            this.focusCamera(ROW_Y.stopwords);
        }
    }

    // 3) Vocabulary Lookup: show a small dictionary hint per token
    vocabLookup(tokenId, vocabText) {
        if (!this.state.createdRows.has('vocabulary')) {
            this._createStageLabel('VOCAB', ROW_Y.vocabulary, 'rgba(244, 114, 182, 0.9)', 5);
            this._createArrow(ROW_Y.stems - 0.8, ROW_Y.vocabulary + 0.8);
            this.state.createdRows.add('vocabulary');
        }

        const idx = this.state.tokenIds.indexOf(tokenId);
        if (idx === -1) return;

        const spacing = 4.0;
        const startX = -(this.state.tokenIds.length - 1) * spacing / 2;
        const x = startX + idx * spacing;

        const mesh = this._createTextBlock(vocabText, COLORS.vocabulary, 0.8);
        mesh.position.set(x, ROW_Y.vocabulary, 0);
        this.scene.add(mesh);
        this.objects[`vocab_${idx}`] = mesh;
        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.5)' });

        this.focusCamera(ROW_Y.vocabulary);
    }

    // 4) Translation Mapping: show mapping note before final translation
    mapTranslation(tokenId, mappingText) {
        if (!this.state.createdRows.has('translated')) {
            // Ensure translated row label exists later; mapping lives above it (vocabulary)
            // Here we create a mapping label just once for clarity
            if (!this.state.createdRows.has('mapping')) {
                this._createStageLabel('MAPPING', ROW_Y.translated, 'rgba(34, 197, 94, 0.9)', 6);
                this._createArrow(ROW_Y.vocabulary - 0.8, ROW_Y.translated + 0.8);
                this.state.createdRows.add('mapping');
            }
        }

        const idx = this.state.tokenIds.indexOf(tokenId);
        if (idx === -1) return;

        const spacing = 4.0;
        const startX = -(this.state.tokenIds.length - 1) * spacing / 2;
        const x = startX + idx * spacing;

        const mesh = this._createTextBlock(mappingText, COLORS.mapping, 0.8);
        mesh.position.set(x, ROW_Y.translated, 0.01);
        this.scene.add(mesh);
        this.objects[`map_${idx}`] = mesh;
        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'back.out(1.5)' });

        this.focusCamera(ROW_Y.translated);
    }

    // 5) Grammar Reconstruction note (before final output)
    grammarReconstruct(sentenceId, grammarNote) {
        if (!this.state.createdRows.has('grammar')) {
            this._createStageLabel('GRAMMAR', ROW_Y.grammar, 'rgba(245, 158, 11, 0.9)', 7);
            this._createArrow(ROW_Y.translated - 0.8, ROW_Y.grammar + 0.8);
            this.state.createdRows.add('grammar');
        }

        // Show a single grammar note centered for the sentence
        const mesh = this._createTextBlock(grammarNote, COLORS.grammar, 1.0);
        mesh.position.set(0, ROW_Y.grammar, 0);
        this.scene.add(mesh);
        this.objects[`${sentenceId}_grammar`] = mesh;
        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.5)' });

        this.focusCamera(ROW_Y.grammar);
    }

    stemWord(tokenId, rootForm) {
        const idx = this.state.tokenIds.indexOf(tokenId);
        if (idx === -1) return;

        if (!this.state.createdRows.has('stems')) {
            this._createStageLabel('STEM', ROW_Y.stems, 'rgba(16, 185, 129, 0.9)', 3);
            this._createArrow(ROW_Y.tokens - 0.8, ROW_Y.stems + 0.8);
            this.state.createdRows.add('stems');
        }

        const spacing = 4.0;
        const startX = -(this.state.tokenIds.length - 1) * spacing / 2;
        const x = startX + idx * spacing;

        const mesh = this._createTextBlock(rootForm, COLORS.stemming);
        mesh.position.set(x, ROW_Y.stems, 0);

        this.scene.add(mesh);
        this.objects[`stem_${idx}`] = mesh;

        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.5)' });

        this.focusCamera(ROW_Y.stems);
    }

    translateWord(tokenId, translatedText) {
        const idx = this.state.tokenIds.indexOf(tokenId);
        if (idx === -1) return;

        if (!this.state.createdRows.has('translated')) {
            this._createStageLabel('TRANSLATE', ROW_Y.translated, 'rgba(139, 92, 246, 0.9)', 4);
            this._createArrow(ROW_Y.stems - 0.8, ROW_Y.translated + 0.8);
            this.state.createdRows.add('translated');
        }

        const spacing = 4.0;
        const startX = -(this.state.tokenIds.length - 1) * spacing / 2;
        const x = startX + idx * spacing;

        const mesh = this._createTextBlock(translatedText, COLORS.translation);
        mesh.position.set(x, ROW_Y.translated, 0);

        this.scene.add(mesh);
        this.objects[`trans_${idx}`] = mesh;

        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.5)' });

        this.focusCamera(ROW_Y.translated);
    }

    combineWords(tokenIds, sentenceId, finalText, y = -10) {
        if (!this.state.createdRows.has('final')) {
            this._createStageLabel('OUTPUT', ROW_Y.final, 'rgba(245, 158, 11, 0.9)', 5);
            this._createArrow(ROW_Y.translated - 0.8, ROW_Y.final + 0.8);
            this.state.createdRows.add('final');
        }

        setTimeout(() => {
            // Create final sentence with the ACTUAL translated text
            const mesh = this._createTextBlock(finalText, COLORS.reconstruction, 2.2);
            mesh.position.set(0, ROW_Y.final, 0);

            this.scene.add(mesh);
            this.objects[sentenceId] = mesh;

            mesh.scale.set(0, 0, 0);
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' });

            // Success indicator
            setTimeout(() => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 500;
                canvas.height = 80;

                ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
                ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 10);
                ctx.fill();

                ctx.font = 'bold 32px Arial';
                ctx.fillStyle = '#22c55e';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✓ Translation Complete!', canvas.width / 2, canvas.height / 2);

                const texture = new THREE.CanvasTexture(canvas);
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
                // Place the banner just below the output text, smaller and non-obstructive
                sprite.position.set(0, ROW_Y.final - 1.8, 0);
                sprite.scale.set(4.2, 0.7, 1);
                sprite.renderOrder = 1000;

                this.scene.add(sprite);
                this.state.labels.push(sprite);

                sprite.material.opacity = 0;
                gsap.to(sprite.material, { opacity: 1, duration: 0.5 });
            }, 400);

            // Focus even closer on the final output for readability
            this.focusCamera(ROW_Y.final, 0.9);
        }, 600);
    }

    highlightStage(stage) {
        if (!stage) return;
        // Map incoming stage names to row keys and Y positions
        const stageToY = {
            input: ROW_Y.input,
            normalization: ROW_Y.normalize,
            normalize: ROW_Y.normalize,
            tokenization: ROW_Y.tokens,
            tokens: ROW_Y.tokens,
            stopwords: ROW_Y.stopwords,
            stemming: ROW_Y.stems,
            stems: ROW_Y.stems,
            vocabulary: ROW_Y.vocabulary,
            mapping: ROW_Y.translated, // mapping label lives on translated row
            translation: ROW_Y.translated,
            grammar: ROW_Y.grammar,
            reconstruction: ROW_Y.final,
            output: ROW_Y.final,
            final: ROW_Y.final,
        };

        const y = stageToY[stage];
        if (typeof y !== 'number') return;

        // Focus camera on stage row
        this.focusCamera(y);

        // Try to find a label sprite placed at this Y and pulse it
        const tol = 0.1;
        const labelSprite = this.state.labels.find(s => Math.abs((s.position?.y ?? 0) - y) < tol);
        if (labelSprite) {
            // Gentle pulse
            gsap.fromTo(labelSprite.scale,
                { x: labelSprite.scale.x, y: labelSprite.scale.y },
                { x: labelSprite.scale.x * 1.06, y: labelSprite.scale.y * 1.06, duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }
            );
        }
    }

    clearNLP() {
        this.dispose();
    }
}

export default NLPEngine;
