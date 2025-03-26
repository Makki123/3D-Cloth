export class Spring {
    constructor(type, a, b, rest, k = 0) {
        this.type = type;  
        this.a = a;        
        this.b = b;        
        this.rest = rest;  
        this.k = Number.isFinite(k) ? k : 0; // Validate k
        if (!Number.isFinite(this.k)) {
            console.error(`Invalid spring constant: ${k}. Defaulting to 0.`);
        }
    }
}
