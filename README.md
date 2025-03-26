# 3D-Cloth
This report explains how I implemented a cloth simulation using graphics algorithms and physics principles (physics not so much ) that we took this year. I have used Three.js to handle my rendering and implement physics logic that handles the behavior of the cloth mesh. This project tries to show a realistic cloth behavior under forces like gravity, wind, and spring tension. Where most of the code happens is in cloth.js which handles a **particle system**, **spring connections**, **physics simulation** , **normal calculation** ,and **force calculations**.

**Particle System**: Representing the cloth using masses (particles).
**Spring Connections**:Maintaining cloth structure using various types of springs.
**Physics Simulation**: we use Verlet Integration to simulate motion while making sure we have numerical stability(even though further down you'll see about the issues I have encountered).
**Normal Calculation**: We use this to calculate accurate lighting and shading and use it for the textures(not directly ).
**Force Calculations**: multiple forces like gravity, wind, and spring tension.
