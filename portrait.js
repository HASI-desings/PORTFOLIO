/* ============================================================
   MORPHING PORTRAIT — Three.js centerpiece
   Stage 1 (progress 0.0–0.42): monochrome photographic portrait
   Stage 2 (0.42–0.72): liquid-chrome metallic distortion
   Stage 3 (0.72–1.0):  particle dissolve, code-fragment field,
                        loosely reforms near the cursor
   ============================================================ */

(function(){
  const canvas = document.getElementById('portrait-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.z = 6;

  let width = 0, height = 0;
  function resize(){
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width; height = rect.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // ---------- pointer ----------
  const pointer = { x:0, y:0, targetX:0, targetY:0 };
  canvas.addEventListener('mousemove', (e)=>{
    const r = canvas.getBoundingClientRect();
    pointer.targetX = ((e.clientX - r.left)/r.width) * 2 - 1;
    pointer.targetY = -(((e.clientY - r.top)/r.height) * 2 - 1);
  });
  canvas.addEventListener('mouseleave', ()=>{ pointer.targetX = 0; pointer.targetY = 0; });

  // ---------- shared shader chunks ----------
  const noiseGLSL = `
    vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
    vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0,0.5,1.0,2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
  `;

  // ---------- STAGE 1+2 : portrait plane ----------
  const loader = new THREE.TextureLoader();
  let planeMesh;
  const planeUniforms = {
    uTex: { value: null },
    uProgress: { value: 0 },     // 0 -> 1 across stage 1/2
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0,0) },
    uOpacity: { value: 1 }
  };

  loader.load('assets/portrait.jpg', (tex)=>{
    tex.colorSpace = THREE.SRGBColorSpace;
    planeUniforms.uTex.value = tex;
    const img = tex.image;
    const aspect = img.width / img.height;
    const planeH = 3.6, planeW = planeH * aspect;
    const geo = new THREE.PlaneGeometry(planeW, planeH, 120, 150);

    const mat = new THREE.ShaderMaterial({
      uniforms: planeUniforms,
      transparent: true,
      vertexShader: `
        uniform float uProgress;
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec2 vUv;
        varying float vDisp;
        ${noiseGLSL}
        void main(){
          vUv = uv;
          vec3 pos = position;
          float wob = snoise(vec3(pos.xy * 1.6, uTime * 0.25)) * uProgress;
          pos.z += wob * 0.22;
          pos.x += sin(pos.y * 3.0 + uTime * 0.4) * 0.03 * uProgress;
          float tilt = 0.35;
          pos.z += uMouse.y * tilt * 0.25 * (0.4 + uProgress);
          vDisp = wob;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform float uProgress;
        uniform float uOpacity;
        uniform vec2 uMouse;
        varying vec2 vUv;
        varying float vDisp;
        void main(){
          vec4 tex = texture2D(uTex, vUv);
          float lum = dot(tex.rgb, vec3(0.299,0.587,0.114));
          lum = smoothstep(0.05, 0.95, lum);
          vec3 mono = vec3(lum) * vec3(0.96, 0.96, 0.98);

          vec3 chromeDark = vec3(0.10,0.11,0.13);
          vec3 chromeLight = vec3(0.94,0.96,0.99);
          float rim = pow(1.0 - abs(vUv.x - 0.5) * 1.6, 3.0);
          float bandA = smoothstep(0.2,0.5, lum + vDisp*0.6);
          float bandB = smoothstep(0.5,0.85, lum - vDisp*0.4);
          vec3 chrome = mix(chromeDark, chromeLight, bandA);
          chrome = mix(chrome, vec3(1.0), bandB * rim * 0.6);
          chrome += (uMouse.x*0.5+0.5) * rim * 0.08;

          vec3 color = mix(mono, chrome, smoothstep(0.0,1.0,uProgress));
          gl_FragColor = vec4(color, uOpacity);
        }
      `
    });

    planeMesh = new THREE.Mesh(geo, mat);
    scene.add(planeMesh);

    buildParticles(img);
  });

  // ---------- STAGE 3 : particle dissolve ----------
  let particles;
  const particleUniforms = {
    uProgress: { value: 0 }, // 0 -> 1 within stage 3
    uTime: { value: 0 },
    uMouse3D: { value: new THREE.Vector3(999,999,0) }
  };

  function buildParticles(img){
    const sampleSize = 90;
    const off = document.createElement('canvas');
    off.width = sampleSize; off.height = sampleSize;
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const data = ctx.getImageData(0,0,sampleSize,sampleSize).data;

    const positions = [];
    const originals = [];
    const randoms = [];
    const glyphIdx = [];
    const planeH = 3.6, planeW = planeH * (img.width/img.height);

    for(let y=0; y<sampleSize; y++){
      for(let x=0; x<sampleSize; x++){
        const i = (y*sampleSize + x) * 4;
        const lum = (data[i]+data[i+1]+data[i+2]) / 3 / 255;
        if (lum < 0.15) continue; // skip near-black background
        const px = (x/sampleSize - 0.5) * planeW;
        const py = -(y/sampleSize - 0.5) * planeH;
        positions.push(px, py, (Math.random()-0.5)*0.4);
        originals.push(px, py, 0);
        randoms.push(Math.random(), Math.random(), Math.random());
        glyphIdx.push(Math.floor(Math.random()*10));
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aOriginal', new THREE.Float32BufferAttribute(originals, 3));
    geo.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: particleUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform float uProgress;
        uniform float uTime;
        attribute vec3 aOriginal;
        attribute vec3 aRandom;
        varying float vAlpha;
        ${noiseGLSL}
        void main(){
          vec3 scattered = aOriginal + (aRandom - 0.5) * 2.6 * uProgress;
          scattered.z += (aRandom.z - 0.5) * 2.2 * uProgress;
          scattered.x += sin(uTime * (0.3+aRandom.x)) * 0.15 * uProgress;
          scattered.y += cos(uTime * (0.3+aRandom.y)) * 0.15 * uProgress;
          vec3 pos = mix(aOriginal, scattered, smoothstep(0.0,1.0,uProgress));
          vAlpha = smoothstep(0.0, 0.25, uProgress);
          vec4 mv = modelViewMatrix * vec4(pos,1.0);
          gl_PointSize = (2.2 + aRandom.x*2.0) * (300.0/-mv.z) * (0.4+uProgress*0.8);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          gl_FragColor = vec4(0.85,0.9,0.98, vAlpha * (1.0-d*1.6));
        }
      `
    });

    particles = new THREE.Points(geo, mat);
    particles.visible = false;
    scene.add(particles);
  }

  // ---------- scroll-driven progress ----------
  let scrollT = 0; // 0..1 across hero height
  function updateScrollProgress(){
    const heroEl = document.getElementById('home');
    const rect = heroEl.getBoundingClientRect();
    const total = heroEl.offsetHeight - window.innerHeight;
    const passed = -rect.top;
    scrollT = total > 0 ? Math.min(1, Math.max(0, passed/total)) : 0;
  }
  window.addEventListener('scroll', updateScrollProgress, { passive:true });

  // ---------- animation loop ----------
  const clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    pointer.x += (pointer.targetX - pointer.x) * 0.06;
    pointer.y += (pointer.targetY - pointer.y) * 0.06;

    // map scrollT -> the three stages
    const stage2Start = 0.0, stage2Full = 0.55;
    const stage3Start = 0.55;
    const progress12 = Math.min(1, scrollT / stage2Full);
    const progress3 = Math.max(0, (scrollT - stage3Start) / (1 - stage3Start));

    planeUniforms.uProgress.value = progress12;
    planeUniforms.uTime.value = t;
    planeUniforms.uMouse.value.set(pointer.x, pointer.y);
    planeUniforms.uOpacity.value = 1 - Math.min(1, progress3*1.3);

    if (planeMesh){
      planeMesh.rotation.y = pointer.x * 0.25;
      planeMesh.rotation.x = -pointer.y * 0.15;
      planeMesh.visible = planeUniforms.uOpacity.value > 0.01;
    }

    if (particles){
      particleUniforms.uProgress.value = progress3;
      particleUniforms.uTime.value = t;
      particles.visible = progress3 > 0.001;
      particles.rotation.y = pointer.x * 0.3;
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  resize();
  updateScrollProgress();
  animate();
})();
