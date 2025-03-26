export class BigVec3D {
    constructor(initSize) {
        this.size = initSize;
        this.data = new Float32Array(initSize * 3);
    }

    init(x, y, z) {
        for (let i = 0; i < this.data.length; i += 3) {
            this.data[i+0] = x;
            this.data[i+1] = y;
            this.data[i+2] = z;
        }
    }
    zero() {
        this.data.fill(0.0);
    }
    copy(other) {
        this.data.set(other.data);
    }
    addScaledVector(other, scale) {
        for (let i = 0; i < this.data.length; i++) {
            this.data[i] += other.data[i] * scale;
        }
    }
}
