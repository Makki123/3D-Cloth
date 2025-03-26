import { BigVec3D } from './BigVec3D.js';
import { Spring } from './Spring.js';

export class Cloth {
    constructor(Options) {
        this.Options = Options;
        const w = Options.clothWidth;
        const h = Options.clothHeight;
        const size = 1.0;

        this.StructSpring = 0;
        this.ShearSpring = 1;
        this.BendSpring = 2;

        let points = [];
        let texcoords = [];
        for (let i = 0; i < h; ++i) {
            for (let j = 0; j < w; ++j) {
                points.push((j / (w - 1.0) - 0.5) * size, (i / (h - 1.0) - 0.5) * size, 0.0);
                texcoords.push(j / (w - 1.0), i / (h - 1.0));
            }
        }

        let dx = points[0] - points[3];
        let dy = points[1] - points[4];
        let dz = points[2] - points[5];
        let r = Math.sqrt(dx * dx + dy * dy + dz * dz) * Options.tension;
        

        let springs = [];

        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                if (i < h - 1)
                    springs.push(new Spring(this.StructSpring, i * w + j, (i + 1) * w + j, r, Options.structK));
                if (j < w - 1)
                    springs.push(new Spring(this.StructSpring, i * w + j, i * w + (j + 1), r, Options.structK));
            }
        }
        
        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                if (j < w - 1 && i < h - 1)
                    springs.push(new Spring(this.ShearSpring, i * w + j, (i + 1) * w + (j + 1), r * Math.sqrt(2), Options.shearK));
                if (j > 0 && i < h - 1)
                    springs.push(new Spring(this.ShearSpring, i * w + j, (i + 1) * w + (j - 1), r * Math.sqrt(2), Options.shearK));
            }
        }

        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                if (i < h - 2)
                    springs.push(new Spring(this.BendSpring, i * w + j, (i + 2) * w + j, r * 2.0, Options.bendK));
                if (j < w - 2)
                    springs.push(new Spring(this.BendSpring, i * w + j, i * w + (j + 2), r * 2.0, Options.bendK));
            }
        }

        let tris = [];
        for (let i = 0; i < h - 1; ++i) {
            for (let j = 0; j < w - 1; ++j) {
                let v0 = i * w + j, v1 = i * w + (j + 1);
                let v2 = (i + 1) * w + (j + 1), v3 = (i + 1) * w + j;
                tris.push(v0, v1, v2, v2, v3, v0);
            }
        }

        this.n = points.length / 3;
        this.uvs = new Float32Array(texcoords);
        this.tris = new Uint16Array(tris);
        this.springs = springs;

        this.X = new BigVec3D(this.n);
        this.X.data.set(points);
        this.Xold = new BigVec3D(this.n);
        this.Xold.data.set(points);
        this.F = new BigVec3D(this.n);
        this.N = new BigVec3D(this.n);
        this.M = new Float32Array(this.n);
        for (let i = 0; i < this.n; ++i) this.M[i] = Options.mass;

        this.pinned = new Set();
        if (Options.pinned.bottomLeft) this.pointStatusSet(0, true);
        if (Options.pinned.bottomRight) this.pointStatusSet(w - 1, true);
        if (Options.pinned.topLeft) this.pointStatusSet((h - 1) * w, true);
        if (Options.pinned.topRight) this.pointStatusSet(h * w - 1, true);

        this.wind = new Float32Array([Options.wind[0], Options.wind[1], Options.wind[2]]);
    }

    pointStatusSet(index, pin) {
        if (pin) {
            this.pinned.add(index);
        } else {
            this.pinned.delete(index);
        }
        
        
    }
    
    calcNormals() {
        this.N.init(0, 0, 0);
        let N = this.N.data, X = this.X.data;
        let tris = this.tris;
        for (let i = 0, l = tris.length; i < l; i += 3) {
            let v0i = tris[i + 0] * 3, v1i = tris[i + 1] * 3, v2i = tris[i + 2] * 3;

            let v0x = X[v0i], v0y = X[v0i + 1], v0z = X[v0i + 2];
            let v1x = X[v1i], v1y = X[v1i + 1], v1z = X[v1i + 2];
            let v2x = X[v2i], v2y = X[v2i + 1], v2z = X[v2i + 2];

            let d10x = v1x - v0x, d10y = v1y - v0y, d10z = v1z - v0z;
            let d21x = v2x - v1x, d21y = v2y - v1y, d21z = v2z - v1z;

            let nx = (d10y * d21z - d10z * d21y);
            let ny = (d10z * d21x - d10x * d21z);
            let nz = (d10x * d21y - d10y * d21x);
            N[v0i] += nx; N[v0i + 1] += ny; N[v0i + 2] += nz;
            N[v1i] += nx; N[v1i + 1] += ny; N[v1i + 2] += nz;
            N[v2i] += nx; N[v2i + 1] += ny; N[v2i + 2] += nz;
        }
        for (let i = 0; i < this.n; ++i) {
            let ii = i * 3;
            let x = N[ii], y = N[ii + 1], z = N[ii + 2];
            let len = Math.sqrt(x * x + y * y + z * z);
            if (len > 1e-14) {
                N[ii] = x / len;
                N[ii + 1] = y / len;
                N[ii + 2] = z / len;
            }
        }
    }

    calcForces() {
        this.F.init(0, this.Options.gravity * this.Options.mass, 0);
    
        const wx = this.wind[0], wy = this.wind[1], wz = this.wind[2];
        const dampAir = this.Options.dampAir;
        const X = this.X.data;
        const N = this.N.data;
        const F = this.F.data;
        const mass = this.Options.mass;
    
        const dt = this.Options.timeStep;
        let Vapprox = new Float32Array(this.n * 3);
        for (let i = 0; i < this.n; ++i) {
            let ii = i * 3;
            Vapprox[ii] = (X[ii] - this.Xold.data[ii]) / dt;
            Vapprox[ii + 1] = (X[ii + 1] - this.Xold.data[ii + 1]) / dt;
            Vapprox[ii + 2] = (X[ii + 2] - this.Xold.data[ii + 2]) / dt;
        }
    
        for (let i = 0; i < this.n; ++i) {
            let ii = i * 3;
            let vx = Vapprox[ii] - wx, vy = Vapprox[ii + 1] - wy, vz = Vapprox[ii + 2] - wz;
            let nx = N[ii], ny = N[ii + 1], nz = N[ii + 2];
            let vwdn = vx * nx + vy * ny + vz * nz;
            let s = dampAir * vwdn;
            F[ii] -= nx * s;
            F[ii + 1] -= ny * s;
            F[ii + 2] -= nz * s;
        }
    
        for (let s of this.springs) {
            if (!Number.isFinite(s.k) || s.k <= 0) {
                console.warn(`Skipping invalid spring with k=${s.k}`);
                continue;
            }
    
            let a = s.a, b = s.b;
            let a3 = a * 3, b3 = b * 3;
    
            let ax = X[a3], ay = X[a3 + 1], az = X[a3 + 2];
            let bx = X[b3], by = X[b3 + 1], bz = X[b3 + 2];
    
            let dx = bx - ax, dy = by - ay, dz = bz - az;
            let length = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (length < 1e-14) continue;
    
            let il = 1.0 / length;
            dx *= il; dy *= il; dz *= il;
    
            let vax = Vapprox[a3], vay = Vapprox[a3 + 1], vaz = Vapprox[a3 + 2];
            let vbx = Vapprox[b3], vby = Vapprox[b3 + 1], vbz = Vapprox[b3 + 2];
            let velDot = (vbx - vax) * dx + (vby - vay) * dy + (vbz - vaz) * dz;
    
            let forceMag = s.k * (length - s.rest) + this.Options.dampSpring * velDot;
            let fx = dx * forceMag, fy = dy * forceMag, fz = dz * forceMag;
    
            F[a3] += fx;
            F[a3 + 1] += fy;
            F[a3 + 2] += fz;
    
            F[b3] -= fx;
            F[b3 + 1] -= fy;
            F[b3 + 2] -= fz;
    
            console.log(`a (${ax}, ${ay}, ${az}), b (${bx}, ${by}, ${bz}), length: ${length}`);
        }
    }
    
    

    simulate(dt) {
        if (dt <= 0.0) return;

        
 

        this.calcNormals();
        

        this.calcForces();
        

        const X = this.X.data;
        const Xold = this.Xold.data;
        const F = this.F.data;
        const mass = this.Options.mass;
        const dt2 = dt * dt;

        let kineticEnergy = 0;
        let potentialEnergySpring = 0;
        let potentialEnergyGravity = 0;

        for (let i = 0; i < this.n; ++i) {
            let ii = i * 3;

            if (this.pinned.has(i)) {
                Xold[ii] = X[ii];
                Xold[ii + 1] = X[ii + 1];
                Xold[ii + 2] = X[ii + 2];
                continue;
            }

            let x = X[ii];
            let y = X[ii + 1];
            let z = X[ii + 2];

            let xnew = x + (x - Xold[ii]) + (F[ii] / mass) * dt2;
            let ynew = y + (y - Xold[ii + 1]) + (F[ii + 1] / mass) * dt2;
            let znew = z + (z - Xold[ii + 2]) + (F[ii + 2] / mass) * dt2;

            let vx = (xnew - x) / dt;
            let vy = (ynew - y) / dt;
            let vz = (znew - z) / dt;
          
            
            kineticEnergy += 0.5 * mass * (vx * vx + vy * vy + vz * vz);


            potentialEnergyGravity += mass * Math.abs(this.Options.gravity) * y;

            Xold[ii] = x;
            Xold[ii + 1] = y;
            Xold[ii + 2] = z;

            X[ii] = xnew;
            X[ii + 1] = ynew;
            X[ii + 2] = znew;
        }

        for (let s of this.springs) {
            let a = s.a;
            let b = s.b;
            let restLength = s.rest;

            let ax = X[a * 3], ay = X[a * 3 + 1], az = X[a * 3 + 2];
            let bx = X[b * 3], by = X[b * 3 + 1], bz = X[b * 3 + 2];

            let dx = bx - ax;
            let dy = by - ay;
            let dz = bz - az;
            let length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (length < 1e-14) continue;
            
            let stretch = length - restLength;
            potentialEnergySpring += 0.5 * s.k * stretch * stretch;


        }

        
        
        
    }

    populateVertexBuffer(buf) {
        let pos = this.X.data;
        let nor = this.N.data;
        let tex = this.uvs;
        let size = this.X.size;

        for (let i = 0, i3 = 0, i2 = 0, i8 = 0; i < size; ++i, i2 += 2, i3 += 3, i8 += 8) {
            buf[i8 + 0] = pos[i3 + 0];
            buf[i8 + 1] = pos[i3 + 1];
            buf[i8 + 2] = pos[i3 + 2];
            buf[i8 + 3] = nor[i3 + 0];
            buf[i8 + 4] = nor[i3 + 1];
            buf[i8 + 5] = nor[i3 + 2];
            buf[i8 + 6] = tex[i2 + 0];
            buf[i8 + 7] = tex[i2 + 1];
        }
    }
}
