window.TypeCraftEngine = {
    parseTS(val, name, registries, options) {
        if (val === null || val === undefined) return 'any;';
        if (Array.isArray(val)) {
            if (val.length === 0) return 'any[];';
            const first = val[0];
            if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
                const childName = this.singularize(name);
                this.parseTS(first, childName, registries, options);
                return `${childName}[];`;
            }
            return `${typeof first}[];`;
        }
        if (typeof val === 'object') {
            const lines = [];
            const opt = options.optionalFields ? '?' : '';
            for (const key in val) {
                const sub = val[key];
                const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
                if (sub === null || sub === undefined) {
                    lines.push(`  ${safeKey}${opt}: any;`);
                } else if (Array.isArray(sub)) {
                    if (sub.length > 0 && typeof sub[0] === 'object' && sub[0] !== null) {
                        const childName = this.capitalize(key);
                        this.parseTS(sub[0], childName, registries, options);
                        lines.push(`  ${safeKey}${opt}: ${childName}[];`);
                    } else {
                        const stype = sub.length > 0 ? typeof sub[0] : 'any';
                        lines.push(`  ${safeKey}${opt}: ${stype}[];`);
                    }
                } else if (typeof sub === 'object') {
                    const childName = this.capitalize(key);
                    this.parseTS(sub, childName, registries, options);
                    lines.push(`  ${safeKey}${opt}: ${childName};`);
                } else {
                    lines.push(`  ${safeKey}${opt}: ${typeof sub};`);
                }
            }
            registries[name] = lines.join('\n');
            return name;
        }
        return `${typeof val};`;
    },

    parseZod(val, name, registries, options) {
        if (val === null || val === undefined) return 'z.any()';
        if (Array.isArray(val)) {
            if (val.length === 0) return 'z.array(z.any())';
            const first = val[0];
            if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
                const childName = this.singularize(name);
                this.parseZod(first, childName, registries, options);
                return `z.array(${childName})`;
            }
            return `z.array(z.${typeof first}())`;
        }
        if (typeof val === 'object') {
            const lines = [];
            const optSuffix = options.optionalFields ? '.optional()' : '';
            for (const key in val) {
                const sub = val[key];
                const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
                if (sub === null || sub === undefined) {
                    lines.push(`  ${safeKey}: z.any()${optSuffix},`);
                } else if (Array.isArray(sub)) {
                    if (sub.length > 0 && typeof sub[0] === 'object' && sub[0] !== null) {
                        const childName = this.capitalize(key);
                        this.parseZod(sub[0], childName, registries, options);
                        lines.push(`  ${safeKey}: z.array(${childName})${optSuffix},`);
                    } else {
                        const stype = sub.length > 0 ? typeof sub[0] : 'string';
                        lines.push(`  ${safeKey}: z.array(z.${stype}())${optSuffix},`);
                    }
                } else if (typeof sub === 'object') {
                    const childName = this.capitalize(key);
                    this.parseZod(sub, childName, registries, options);
                    lines.push(`  ${safeKey}: ${childName}${optSuffix},`);
                } else {
                    lines.push(`  ${safeKey}: z.${typeof sub}()${optSuffix},`);
                }
            }
            registries[name] = lines.join('\n');
            return name;
        }
        return `z.${typeof val}()`;
    },

    parsePydantic(val, name, registries, options) {
        if (val === null || val === undefined) return 'Any';
        if (Array.isArray(val)) {
            if (val.length === 0) return 'List[Any]';
            const first = val[0];
            if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
                const childName = this.singularize(name);
                this.parsePydantic(first, childName, registries, options);
                return `List[${childName}]`;
            }
            const pyType = typeof first === 'number' ? (Number.isInteger(first) ? 'int' : 'float') : (typeof first === 'boolean' ? 'bool' : 'str');
            return `List[${pyType}]`;
        }
        if (typeof val === 'object') {
            const lines = [];
            for (const key in val) {
                const sub = val[key];
                const safeKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `field_${key}`;
                const opt = options.optionalFields;
                if (sub === null || sub === undefined) {
                    lines.push(`    ${safeKey}: ${opt ? 'Optional[Any] = None' : 'Any'}`);
                } else if (Array.isArray(sub)) {
                    if (sub.length > 0 && typeof sub[0] === 'object' && sub[0] !== null) {
                        const childName = this.capitalize(key);
                        this.parsePydantic(sub[0], childName, registries, options);
                        lines.push(`    ${safeKey}: ${opt ? `Optional[List[${childName}]] = None` : `List[${childName}]`}`);
                    } else {
                        const stype = sub.length > 0 ? (typeof sub[0] === 'number' ? (Number.isInteger(sub[0]) ? 'int' : 'float') : (typeof sub[0] === 'boolean' ? 'bool' : 'str')) : 'Any';
                        lines.push(`    ${safeKey}: ${opt ? `Optional[List[${stype}]] = None` : `List[${stype}]`}`);
                    }
                } else if (typeof sub === 'object') {
                    const childName = this.capitalize(key);
                    this.parsePydantic(sub, childName, registries, options);
                    lines.push(`    ${safeKey}: ${opt ? `Optional[${childName}] = None` : childName}`);
                } else {
                    const t = typeof sub === 'number' ? (Number.isInteger(sub) ? 'int' : 'float') : (typeof sub === 'boolean' ? 'bool' : 'str');
                    lines.push(`    ${safeKey}: ${opt ? `Optional[${t}] = None` : t}`);
                }
            }
            registries[name] = lines.join('\n');
            return name;
        }
        return 'Any';
    },

    capitalize(str) {
        const cleaned = str.replace(/[^a-zA-Z0-9_$]/g, '');
        return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Item';
    },

    singularize(str) {
        const cap = this.capitalize(str);
        if (cap.endsWith('ies')) return cap.slice(0, -3) + 'y';
        if (cap.endsWith('s') && !cap.endsWith('ss')) return cap.slice(0, -1);
        return cap + 'Item';
    }
};
