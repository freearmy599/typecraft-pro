function typeCraftApp() {
    return {
        activeTool: 'synth', // 'synth', 'mock'
        inputJson: '',
        outputCode: '// Paste or load JSON to begin...',
        errorMsg: '',
        copied: false,
        lang: 'ts',
        options: {
            optionalFields: false,
            rootName: 'RootObject'
        },
        history: JSON.parse(localStorage.getItem('tc_history') || '[]'),
        
        // Mock Generator State
        mockInput: '{\n  "id": 1,\n  "name": "Jane Doe",\n  "isActive": true\n}',
        mockRows: 5,
        mockOutput: '// Click generate mock data...',

        get outputHeaderTitle() {
            if (this.lang === 'ts') return 'TypeScript Interfaces';
            if (this.lang === 'zod') return 'Zod Schema';
            if (this.lang === 'pydantic') return 'Python Pydantic Models';
            return 'Output';
        },

        setLang(l) {
            this.lang = l;
            this.generate();
        },

        loadSample() {
            const sample = {
                "id": 4092,
                "account": "enterprise_user",
                "verified": true,
                "permissions": ["read", "write", "execute"],
                "billing": {
                    "tier": "pro",
                    "balanceDue": 0.00
                }
            };
            this.inputJson = JSON.stringify(sample, null, 2);
            this.generate();
        },

        formatJsonInput() {
            if (!this.inputJson.trim()) return;
            try {
                const parsed = JSON.parse(this.inputJson);
                this.inputJson = JSON.stringify(parsed, null, 2);
                this.errorMsg = '';
                this.generate();
            } catch (e) {
                this.errorMsg = 'Formatting failed: Invalid JSON';
            }
        },

        generate() {
            this.errorMsg = '';
            if (!this.inputJson.trim()) {
                this.outputCode = '// Paste or load JSON to begin...';
                return;
            }
            try {
                const parsed = JSON.parse(this.inputJson);
                const rootName = (this.options.rootName && this.options.rootName.trim()) 
                    ? this.options.rootName.trim() 
                    : 'RootObject';
                
                const registries = {};
                
                if (this.lang === 'ts') {
                    TypeCraftEngine.parseTS(parsed, rootName, registries, this.options);
                    let res = '';
                    for (const name in registries) {
                        res += `interface ${name} {\n${registries[name]}\n}\n\n`;
                    }
                    this.outputCode = res.trim();
                } else if (this.lang === 'zod') {
                    TypeCraftEngine.parseZod(parsed, rootName, registries, this.options);
                    let res = `import { z } from 'zod';\n\n`;
                    for (const name in registries) {
                        res += `export const ${name} = z.object({\n${registries[name]}\n});\n\n`;
                    }
                    this.outputCode = res.trim();
                } else if (this.lang === 'pydantic') {
                    TypeCraftEngine.parsePydantic(parsed, rootName, registries, this.options);
                    let res = `from pydantic import BaseModel\nfrom typing import List, Optional, Any\n\n`;
                    for (const name in registries) {
                        res += `class ${name}(BaseModel):\n${registries[name]}\n\n`;
                    }
                    this.outputCode = res.trim();
                }

                // Save to History LocalStorage
                this.history.unshift({ date: new Date().toLocaleTimeString(), snippet: this.inputJson.slice(0, 30) });
                if (this.history.length > 5) this.history.pop();
                localStorage.setItem('tc_history', JSON.stringify(this.history));

            } catch (e) {
                this.errorMsg = 'JSON Error: ' + e.message;
                this.outputCode = '// Fix syntax errors to update schema';
            }
        },

        generateMock() {
            try {
                const template = JSON.parse(this.mockInput);
                const result = [];
                for (let i = 1; i <= this.mockRows; i++) {
                    const row = {};
                    for (const key in template) {
                        if (typeof template[key] === 'number') {
                            row[key] = template[key] + i;
                        } else if (typeof template[key] === 'string') {
                            row[key] = `${template[key]}_${i}`;
                        } else {
                            row[key] = template[key];
                        }
                    }
                    result.push(row);
                }
                this.mockOutput = JSON.stringify(result, null, 2);
            } catch (e) {
                this.mockOutput = '// Error: Invalid JSON template syntax';
            }
        },

        copyOutput() {
            navigator.clipboard.writeText(this.outputCode);
            this.copied = true;
            setTimeout(() => this.copied = false, 2000);
        }
    }
}
