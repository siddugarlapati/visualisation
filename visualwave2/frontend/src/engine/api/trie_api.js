/**
 * trie_api.js - Trie Data Structure API
 */

export function registerTrieAPI(GSAPEngine) {

    GSAPEngine.prototype.trieRootId = null;

    GSAPEngine.prototype.trieInit = function (x = 0, y = 0) {
        const rootId = "trie_root";
        this.trieRootId = rootId;
        this.createSphereNode(rootId, "∅", { x, y, z: 0 });
        this.pulse(rootId);
        this.focusCamera(rootId);
    };

    GSAPEngine.prototype._trieNodeId = function (prefix, char) {
        return `${prefix}_${char}`;
    };

    GSAPEngine.prototype.trieInsert = function (word, baseX = 0, baseY = 0) {
        if (!this.trieRootId) return;

        let prefix = "trie_root";
        let depth = 1;

        for (let i = 0; i < word.length; i++) {
            const ch = word[i];
            const nodeId = this._trieNodeId(prefix, ch);

            if (!this.objects[nodeId]) {
                const x = baseX + (i - word.length / 2) * 1.5;
                const y = baseY - depth * 2;
                this.createSphereNode(nodeId, ch, { x, y, z: 0 });
                this.connect(prefix, nodeId);
            }

            this.highlight(nodeId, 0x3b82f6);
            this.pulse(nodeId);
            this.focusCamera(nodeId);

            prefix = nodeId;
            depth++;
        }

        // Mark word end
        const endMarkerId = `${prefix}_end`;
        if (!this.objects[endMarkerId]) {
            const lastNode = this.objects[prefix];
            const lastPos = lastNode.group.position;
            this.createSphereNode(endMarkerId, "●", { x: lastPos.x, y: lastPos.y - 1.5, z: 0 });
            this.connect(prefix, endMarkerId);
        }

        this.confetti(prefix, "green");
    };

    GSAPEngine.prototype.trieSearch = function (word) {
        if (!this.trieRootId) return false;

        let prefix = "trie_root";
        this.highlight(prefix, 0x3b82f6);

        for (let i = 0; i < word.length; i++) {
            const ch = word[i];
            const nodeId = this._trieNodeId(prefix, ch);

            if (!this.objects[nodeId]) {
                this.shake(prefix);
                return false;
            }

            this.bump(prefix, nodeId);
            this.highlight(nodeId, 0x3b82f6);
            this.focusCamera(nodeId);

            prefix = nodeId;
        }

        const endMarkerId = `${prefix}_end`;
        if (!this.objects[endMarkerId]) {
            this.shake(prefix);
            return false;
        }

        this.confetti(prefix, "green");
        return true;
    };

    GSAPEngine.prototype.trieHighlightPrefix = function (prefixString) {
        if (!this.trieRootId) return;

        let prefix = "trie_root";
        this.highlight(prefix, 0x3b82f6);

        for (let i = 0; i < prefixString.length; i++) {
            const ch = prefixString[i];
            const nodeId = this._trieNodeId(prefix, ch);

            if (!this.objects[nodeId]) {
                this.shake(prefix);
                return null;
            }

            this.highlight(nodeId, 0xf59e0b);
            this.pulse(nodeId);

            prefix = nodeId;
        }

        return prefix;
    };

    GSAPEngine.prototype.trieSuggestFrom = function (nodeId) {
        if (!this.objects[nodeId]) return;
        this.highlight(nodeId, 0x3b82f6);
        this.pulse(nodeId);
    };
}
