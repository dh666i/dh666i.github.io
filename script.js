/* ==========================================================
   CHICHI · 万物皆流 PANTA RHEI — 实时流体网页艺术
   ========================================================== */

const profile = {
    github: 'https://github.com/dh666i',
    githubLabel: '@dh666i'
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const noHover = window.matchMedia('(hover: none)').matches;
const narrow = window.matchMedia('(max-width: 860px)');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    tx: window.innerWidth / 2,
    ty: window.innerHeight / 2
};

/* ---------- 基础信息 ---------- */

function applyProfile() {
    document.querySelectorAll('[data-github-link]').forEach((node) => { node.href = profile.github; });
    document.querySelectorAll('[data-github-text]').forEach((node) => { node.textContent = profile.githubLabel; });
    document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });
}

function initClock() {
    const nodes = document.querySelectorAll('[data-clock]');
    if (!nodes.length) return;

    const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const tick = () => {
        const now = formatter.format(new Date());
        nodes.forEach((node) => { node.textContent = now; });
    };

    tick();
    setInterval(tick, 1000);
}

/* ---------- 开场装载 ---------- */

function initLoader() {
    const loader = document.querySelector('[data-loader]');
    const bar = document.querySelector('[data-loader-bar]');
    const count = document.querySelector('[data-loader-count]');

    const finish = () => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('ready');
        window.dispatchEvent(new CustomEvent('site:ready'));
        if (!loader) return;
        loader.classList.add('done');
        setTimeout(() => loader.classList.add('gone'), 1300);
    };

    if (!loader || reduceMotion) {
        if (loader) loader.classList.add('gone');
        document.body.classList.remove('is-loading');
        document.body.classList.add('ready');
        window.dispatchEvent(new CustomEvent('site:ready'));
        return;
    }

    const duration = 1350;
    const start = performance.now();

    const step = (now) => {
        const linear = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - linear, 3);
        if (bar) bar.style.transform = `scaleX(${eased})`;
        if (count) count.textContent = String(Math.round(eased * 100)).padStart(2, '0');
        if (linear < 1) {
            requestAnimationFrame(step);
        } else {
            setTimeout(finish, 160);
        }
    };

    requestAnimationFrame(step);
}

/* ==========================================================
   实时流体引擎 · Navier-Stokes on GPU
   指针即笔锋，屏幕即砚池
   ========================================================== */

function initFluid() {
    const canvas = document.querySelector('[data-fluid]');
    if (!canvas || reduceMotion) return;

    const params = {
        simRes: narrow.matches ? 96 : 144,
        dyeRes: narrow.matches ? 320 : 560,
        densityDissipation: 0.7,
        velocityDissipation: 0.3,
        pressureDissipation: 0.86,
        pressureIterations: narrow.matches ? 14 : 22,
        curl: 28,
        splatRadius: 0.0036,
        splatForce: 5600
    };

    let gl = canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false });
    const isWebGL2 = Boolean(gl);
    if (!gl) {
        gl = canvas.getContext('webgl', { alpha: false, depth: false, stencil: false, antialias: false })
            || canvas.getContext('experimental-webgl', { alpha: false, depth: false, stencil: false, antialias: false });
    }
    if (!gl) {
        canvas.remove();
        return;
    }

    let halfFloat = null;
    let supportLinearFiltering = false;
    if (isWebGL2) {
        supportLinearFiltering = true;
        if (!gl.getExtension('EXT_color_buffer_float')) {
            if (!gl.getExtension('EXT_color_buffer_half_float')) {
                canvas.remove();
                return;
            }
        }
    } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = Boolean(gl.getExtension('OES_texture_half_float_linear'));
        if (!halfFloat) {
            canvas.remove();
            return;
        }
    }

    const texType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    const internalFormat = isWebGL2 ? gl.RGBA16F : gl.RGBA;
    const format = gl.RGBA;
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    /* ---- 着色器 ---- */

    const baseVertex = `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const splatShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
        void main () {
            vec2 p = vUv - point;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    `;

    const advectionShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5;
            vec2 iuv = floor(st);
            vec2 fuv = fract(st);
            vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
            vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
            vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
            vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
            return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }
        void main () {
        #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
        #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
        #endif
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
            gl_FragColor.a = 1.0;
        }
    `;

    const divergenceShader = `
        precision mediump float;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;
            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
    `;

    const curlShader = `
        precision mediump float;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
    `;

    const vorticityShader = `
        precision highp float;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity += force * dt;
            velocity = min(max(velocity, -1000.0), 1000.0);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `;

    const pressureShader = `
        precision mediump float;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
    `;

    const gradientSubtractShader = `
        precision mediump float;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `;

    const clearShader = `
        precision mediump float;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
    `;

    const displayShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        float hash (vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        void main () {
            vec3 dye = texture2D(uTexture, vUv).rgb * 1.35;
            dye = dye / (1.0 + dot(dye, vec3(0.26)));
            vec3 col = vec3(0.022, 0.018, 0.04);
            col += vec3(0.085, 0.04, 0.14) * smoothstep(1.15, 0.05, distance(vUv, vec2(0.78, 0.92)));
            col += vec3(0.06, 0.018, 0.012) * smoothstep(1.05, 0.0, distance(vUv, vec2(0.08, 0.05)));
            col += dye;
            float vig = smoothstep(1.5, 0.32, length(vUv - 0.5));
            col *= mix(0.6, 1.0, vig);
            col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    /* ---- 编译与管线 ---- */

    const compile = (type, source, keywords) => {
        const prefixed = keywords ? `${keywords}\n${source}` : source;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, prefixed);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
        return shader;
    };

    const vertexShader = compile(gl.VERTEX_SHADER, baseVertex);
    if (!vertexShader) {
        canvas.remove();
        return;
    }

    const createProgram = (fragSource, keywords) => {
        const fragShader = compile(gl.FRAGMENT_SHADER, fragSource, keywords);
        if (!fragShader) return null;
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
        const uniforms = {};
        const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i += 1) {
            const name = gl.getActiveUniform(program, i).name;
            uniforms[name] = gl.getUniformLocation(program, name);
        }
        return { program, uniforms };
    };

    const programs = {
        splat: createProgram(splatShader),
        advection: createProgram(advectionShader, supportLinearFiltering ? null : '#define MANUAL_FILTERING'),
        divergence: createProgram(divergenceShader),
        curl: createProgram(curlShader),
        vorticity: createProgram(vorticityShader),
        pressure: createProgram(pressureShader),
        gradient: createProgram(gradientSubtractShader),
        clear: createProgram(clearShader),
        display: createProgram(displayShader)
    };

    if (Object.values(programs).some((p) => !p)) {
        canvas.remove();
        return;
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);

    const blit = (target) => {
        if (target) {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        } else {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    /* ---- 帧缓冲 ---- */

    const createFBO = (w, h) => {
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, texType, null);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        return {
            texture,
            fbo,
            width: w,
            height: h,
            texelSizeX: 1 / w,
            texelSizeY: 1 / h,
            attach (id) {
                gl.activeTexture(gl.TEXTURE0 + id);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                return id;
            }
        };
    };

    const createDoubleFBO = (w, h) => {
        let fbo1 = createFBO(w, h);
        let fbo2 = createFBO(w, h);
        return {
            width: w,
            height: h,
            texelSizeX: 1 / w,
            texelSizeY: 1 / h,
            get read () { return fbo1; },
            get write () { return fbo2; },
            swap () {
                const temp = fbo1;
                fbo1 = fbo2;
                fbo2 = temp;
            }
        };
    };

    if (createFBO(4, 4) && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        canvas.remove();
        return;
    }

    const getResolution = (base) => {
        const aspect = Math.max(gl.drawingBufferWidth / gl.drawingBufferHeight, gl.drawingBufferHeight / gl.drawingBufferWidth) || 1;
        const max = Math.round(base * aspect);
        return gl.drawingBufferWidth > gl.drawingBufferHeight
            ? { width: max, height: base }
            : { width: base, height: max };
    };

    let velocity = null;
    let dye = null;
    let divergence = null;
    let curl = null;
    let pressure = null;

    const initFramebuffers = () => {
        const sim = getResolution(params.simRes);
        const dyeRes = getResolution(params.dyeRes);
        velocity = createDoubleFBO(sim.width, sim.height);
        dye = createDoubleFBO(dyeRes.width, dyeRes.height);
        divergence = createFBO(sim.width, sim.height);
        curl = createFBO(sim.width, sim.height);
        pressure = createDoubleFBO(sim.width, sim.height);
    };

    const resizeCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, narrow.matches ? 1 : 1.25);
        const w = Math.max(2, Math.floor(window.innerWidth * dpr * 0.62));
        const h = Math.max(2, Math.floor(window.innerHeight * dpr * 0.62));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            initFramebuffers();
        }
    };

    /* ---- 注墨 ---- */

    const palette = [
        [0.85, 0.16, 0.08],
        [0.92, 0.52, 0.16],
        [0.42, 0.2, 0.95],
        [0.16, 0.66, 0.55],
        [0.2, 0.5, 0.95]
    ];
    let paletteIndex = 0;

    const pickColor = (gain) => {
        paletteIndex = (paletteIndex + 1) % palette.length;
        const base = palette[paletteIndex];
        const jitter = 0.82 + Math.random() * 0.36;
        return [base[0] * gain * jitter, base[1] * gain * jitter, base[2] * gain * jitter];
    };

    const splat = (x, y, dx, dy, color) => {
        const program = programs.splat;
        gl.useProgram(program.program);
        gl.uniform1i(program.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(program.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(program.uniforms.point, x, y);
        gl.uniform3f(program.uniforms.color, dx, dy, 0);
        let radius = params.splatRadius;
        if (canvas.width / canvas.height > 1) radius *= canvas.width / canvas.height;
        gl.uniform1f(program.uniforms.radius, radius);
        blit(velocity.write);
        velocity.swap();

        gl.uniform1i(program.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(program.uniforms.color, color[0], color[1], color[2]);
        blit(dye.write);
        dye.swap();
    };

    /* ---- 推演 ---- */

    let lastTime = performance.now();
    let running = true;
    let prevX = pointer.tx;
    let prevY = pointer.ty;
    let idleTime = 0;

    const step = (dt) => {
        gl.useProgram(programs.curl.program);
        gl.uniform2f(programs.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.curl.uniforms.uVelocity, velocity.read.attach(0));
        blit(curl);

        gl.useProgram(programs.vorticity.program);
        gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.vorticity.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.vorticity.uniforms.uCurl, curl.attach(1));
        gl.uniform1f(programs.vorticity.uniforms.curl, params.curl);
        gl.uniform1f(programs.vorticity.uniforms.dt, dt);
        blit(velocity.write);
        velocity.swap();

        gl.useProgram(programs.divergence.program);
        gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.divergence.uniforms.uVelocity, velocity.read.attach(0));
        blit(divergence);

        gl.useProgram(programs.clear.program);
        gl.uniform1i(programs.clear.uniforms.uTexture, pressure.read.attach(0));
        gl.uniform1f(programs.clear.uniforms.value, params.pressureDissipation);
        blit(pressure.write);
        pressure.swap();

        gl.useProgram(programs.pressure.program);
        gl.uniform2f(programs.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.pressure.uniforms.uDivergence, divergence.attach(0));
        for (let i = 0; i < params.pressureIterations; i += 1) {
            gl.uniform1i(programs.pressure.uniforms.uPressure, pressure.read.attach(1));
            blit(pressure.write);
            pressure.swap();
        }

        gl.useProgram(programs.gradient.program);
        gl.uniform2f(programs.gradient.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(programs.gradient.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(programs.gradient.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write);
        velocity.swap();

        gl.useProgram(programs.advection.program);
        gl.uniform2f(programs.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        if (!supportLinearFiltering) {
            gl.uniform2f(programs.advection.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
        }
        const velocityId = velocity.read.attach(0);
        gl.uniform1i(programs.advection.uniforms.uVelocity, velocityId);
        gl.uniform1i(programs.advection.uniforms.uSource, velocityId);
        gl.uniform1f(programs.advection.uniforms.dt, dt);
        gl.uniform1f(programs.advection.uniforms.dissipation, params.velocityDissipation);
        blit(velocity.write);
        velocity.swap();

        if (!supportLinearFiltering) {
            gl.uniform2f(programs.advection.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
        }
        gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(programs.advection.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(programs.advection.uniforms.dissipation, params.densityDissipation);
        blit(dye.write);
        dye.swap();
    };

    const render = () => {
        gl.useProgram(programs.display.program);
        gl.uniform1i(programs.display.uniforms.uTexture, dye.read.attach(0));
        blit(null);
    };

    /* 闲置时的游走墨源：屏幕永远是活的 */
    const drift = (time, dt) => {
        const t = time * 0.00014;
        const x = 0.5 + 0.36 * Math.sin(t * 1.3) * Math.cos(t * 0.7);
        const y = 0.42 + 0.3 * Math.sin(t * 0.9 + 1.7);
        const dx = Math.cos(t * 1.3) * 26;
        const dy = Math.sin(t * 0.9 + 1.7) * 22;
        if (Math.floor(time / 700) !== Math.floor((time - dt * 1000) / 700)) {
            splat(x, y, dx, dy, pickColor(0.3));
        }
    };

    const frame = (now) => {
        if (!running) return;
        const dt = clamp((now - lastTime) / 1000, 0, 0.0166);
        lastTime = now;

        const dx = pointer.tx - prevX;
        const dy = pointer.ty - prevY;
        prevX = pointer.tx;
        prevY = pointer.ty;

        const speed = Math.hypot(dx, dy);
        if (speed > 0.7) {
            idleTime = 0;
            const fx = (dx / window.innerWidth) * params.splatForce;
            const fy = (-dy / window.innerHeight) * params.splatForce;
            splat(
                pointer.tx / window.innerWidth,
                1 - pointer.ty / window.innerHeight,
                fx,
                fy,
                pickColor(clamp(speed / 70, 0.12, 0.42))
            );
        } else {
            idleTime += dt;
        }

        if (idleTime > 1.2) drift(now, dt);

        step(dt);
        render();
        requestAnimationFrame(frame);
    };

    /* 落水成涟：点击注入一笔重墨 */
    const burst = (clientX, clientY, strength) => {
        const x = clientX / window.innerWidth;
        const y = 1 - clientY / window.innerHeight;
        const count = 7;
        for (let i = 0; i < count; i += 1) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.7;
            const force = strength * (0.6 + Math.random() * 0.7);
            splat(x, y, Math.cos(angle) * force, Math.sin(angle) * force, pickColor(1.0));
        }
    };

    window.addEventListener('pointerdown', (event) => {
        burst(event.clientX, event.clientY, 320);
    }, { passive: true });

    window.addEventListener('site:ready', () => {
        const sweeps = 9;
        for (let i = 0; i < sweeps; i += 1) {
            setTimeout(() => {
                const x = 0.18 + Math.random() * 0.64;
                const y = 0.25 + Math.random() * 0.5;
                const angle = Math.random() * Math.PI * 2;
                const force = 420 + Math.random() * 700;
                splat(x, y, Math.cos(angle) * force, Math.sin(angle) * force, pickColor(0.9));
            }, i * 110);
        }
    });

    document.addEventListener('visibilitychange', () => {
        const wasRunning = running;
        running = !document.hidden;
        if (running && !wasRunning) {
            lastTime = performance.now();
            requestAnimationFrame(frame);
        }
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeCanvas, 180);
    });

    resizeCanvas();
    requestAnimationFrame(frame);
}

/* ---------- 涟漪落点（DOM 层） ---------- */

function initRipples() {
    if (reduceMotion) return;

    window.addEventListener('pointerdown', (event) => {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${event.clientX}px`;
        ripple.style.top = `${event.clientY}px`;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 950);
    }, { passive: true });
}

/* ---------- 指针 ---------- */

function initCursor() {
    if (reduceMotion || noHover) return;

    const dot = document.querySelector('[data-cursor-dot]');
    const ring = document.querySelector('[data-cursor-ring]');
    const interactive = 'a, button, [data-tilt], .panel, .rule-list li';
    let ringX = pointer.x;
    let ringY = pointer.y;

    window.addEventListener('pointermove', (event) => {
        pointer.tx = event.clientX;
        pointer.ty = event.clientY;
        document.body.classList.add('cursor-on');
    }, { passive: true });

    window.addEventListener('pointerdown', () => document.body.classList.add('is-pressing'), { passive: true });
    window.addEventListener('pointerup', () => document.body.classList.remove('is-pressing'), { passive: true });

    document.addEventListener('pointerover', (event) => {
        if (event.target.closest(interactive)) document.body.classList.add('is-hovering');
    });

    document.addEventListener('pointerout', (event) => {
        if (event.target.closest(interactive)) document.body.classList.remove('is-hovering');
    });

    document.documentElement.addEventListener('pointerleave', () => {
        document.body.classList.remove('cursor-on');
    });

    const animate = () => {
        pointer.x += (pointer.tx - pointer.x) * 0.4;
        pointer.y += (pointer.ty - pointer.y) * 0.4;
        ringX += (pointer.tx - ringX) * 0.14;
        ringY += (pointer.ty - ringY) * 0.14;
        if (dot) dot.style.transform = `translate(${pointer.x - 3}px, ${pointer.y - 3}px)`;
        if (ring) ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animate);
    };

    animate();
}

/* ---------- 移动端指针跟踪（无 hover 时仍需驱动流体） ---------- */

function initTouchPointer() {
    if (!noHover) return;

    window.addEventListener('pointermove', (event) => {
        pointer.tx = event.clientX;
        pointer.ty = event.clientY;
    }, { passive: true });
}

/* ---------- 页头 / 菜单 / 导航 ---------- */

function initHeader() {
    const header = document.querySelector('[data-header]');
    if (!header) return;

    const update = () => header.classList.toggle('scrolled', window.scrollY > 28);
    update();
    window.addEventListener('scroll', update, { passive: true });
}

function initMenu() {
    const burger = document.querySelector('.burger');
    const menu = document.querySelector('[data-menu]');
    if (!burger || !menu) return;

    const setOpen = (open) => {
        burger.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-hidden', String(!open));
        menu.classList.toggle('open', open);
        document.body.classList.toggle('menu-open', open);
    };

    burger.addEventListener('click', () => {
        setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setOpen(false);
    });
}

function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            const id = link.getAttribute('href');
            if (!id || id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            event.preventDefault();
            const top = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 70;
            window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    });
}

function initActiveNav() {
    const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const sections = links
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);
    if (!sections.length) return;

    const update = () => {
        const current = sections.reduce((active, section) => {
            return section.getBoundingClientRect().top <= window.innerHeight * 0.4 ? section : active;
        }, null);

        links.forEach((link) => {
            link.classList.toggle('active', Boolean(current) && link.getAttribute('href') === `#${current.id}`);
        });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
}

function initScramble() {
    if (reduceMotion || noHover) return;

    const pool = '水流涌漩息归源墨涟印观';

    document.querySelectorAll('[data-scramble]').forEach((node) => {
        const original = node.textContent;
        let frame = 0;
        let raf = null;

        const run = () => {
            frame += 1;
            if (frame > 9) {
                node.textContent = original;
                raf = null;
                return;
            }
            node.textContent = frame % 2 === 0
                ? pool[Math.floor(Math.random() * pool.length)]
                : original;
            raf = requestAnimationFrame(run);
        };

        node.addEventListener('pointerenter', () => {
            if (raf) cancelAnimationFrame(raf);
            frame = 0;
            raf = requestAnimationFrame(run);
        });
    });
}

/* ---------- 滚动进度 / 显影 ---------- */

function initProgress() {
    const bar = document.querySelector('[data-progress]');
    if (!bar) return;

    const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max <= 0 ? 0 : clamp(window.scrollY / max, 0, 1);
        bar.style.transform = `scaleX(${ratio})`;
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
}

function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    document.querySelectorAll('[data-stagger]').forEach((group) => {
        group.querySelectorAll('[data-reveal]').forEach((item, index) => {
            item.style.setProperty('--rd', `${Math.min(index * 90, 450)}ms`);
        });
    });

    if (!('IntersectionObserver' in window) || reduceMotion) {
        items.forEach((item) => item.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach((item) => observer.observe(item));
}

/* ---------- 源 · 逐字点亮 ---------- */

function initManifesto() {
    const section = document.querySelector('[data-manifesto]');
    const text = section ? section.querySelector('[data-split]') : null;
    if (!section || !text) return;

    const chars = [];
    const splitNode = (node, hot) => {
        Array.from(node.childNodes).forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
                const fragment = document.createDocumentFragment();
                Array.from(child.textContent).forEach((char) => {
                    if (!char.trim()) {
                        fragment.appendChild(document.createTextNode(char));
                        return;
                    }
                    const span = document.createElement('span');
                    span.className = hot ? 'ch hot' : 'ch';
                    span.textContent = char;
                    fragment.appendChild(span);
                    chars.push(span);
                });
                child.replaceWith(fragment);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                splitNode(child, hot || child.classList.contains('hl'));
            }
        });
    };

    splitNode(text, false);

    const sign = section.querySelector('.manifesto-sign');
    if (reduceMotion) return;

    let ticking = false;
    const update = () => {
        ticking = false;
        const range = section.offsetHeight - window.innerHeight;
        if (range <= 0) return;
        const progress = clamp(-section.getBoundingClientRect().top / range, 0, 1);
        const lit = Math.floor(progress * 1.18 * chars.length);
        chars.forEach((char, index) => char.classList.toggle('lit', index < lit));
        if (sign) sign.classList.toggle('lit', progress > 0.88);
    };

    const requestUpdate = () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
}

/* ---------- 流 · 横向手卷 ---------- */

function initHorizontal() {
    const section = document.querySelector('[data-horizontal]');
    const track = section ? section.querySelector('[data-track]') : null;
    if (!section || !track) return;

    let distance = 0;
    let ticking = false;

    const update = () => {
        ticking = false;
        if (!distance) return;
        const range = section.offsetHeight - window.innerHeight;
        if (range <= 0) return;
        const progress = clamp(-section.getBoundingClientRect().top / range, 0, 1);
        track.style.transform = `translate3d(${(-distance * progress).toFixed(1)}px, 0, 0)`;
    };

    const measure = () => {
        if (narrow.matches || reduceMotion) {
            section.style.height = '';
            track.style.transform = '';
            distance = 0;
            return;
        }
        track.style.transform = '';
        distance = Math.max(track.scrollWidth - window.innerWidth, 0);
        section.style.height = `${window.innerHeight + distance}px`;
        update();
    };

    const requestUpdate = () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    };

    measure();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', measure);
    narrow.addEventListener('change', measure);
    window.addEventListener('load', measure);
}

/* ---------- 卡片交互 ---------- */

function initTilt() {
    if (reduceMotion || noHover) return;

    document.querySelectorAll('[data-tilt]').forEach((element) => {
        element.addEventListener('pointermove', (event) => {
            const rect = element.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            element.style.setProperty('--spot-x', `${(x * 100).toFixed(1)}%`);
            element.style.setProperty('--spot-y', `${(y * 100).toFixed(1)}%`);
            element.style.transform =
                `perspective(900px) rotateX(${((y - 0.5) * -5).toFixed(2)}deg) rotateY(${((x - 0.5) * 6).toFixed(2)}deg) translateY(-4px)`;
        });

        element.addEventListener('pointerleave', () => {
            element.style.transform = '';
        });
    });
}

function initMagnetic() {
    if (reduceMotion || noHover) return;

    document.querySelectorAll('.magnetic').forEach((element) => {
        let x = 0;
        let y = 0;
        let tx = 0;
        let ty = 0;
        let raf = null;

        const animate = () => {
            x += (tx - x) * 0.18;
            y += (ty - y) * 0.18;
            element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
            if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) {
                raf = requestAnimationFrame(animate);
            } else {
                raf = null;
                if (!tx && !ty) element.style.transform = '';
            }
        };

        const start = () => {
            if (!raf) raf = requestAnimationFrame(animate);
        };

        element.addEventListener('pointermove', (event) => {
            const rect = element.getBoundingClientRect();
            tx = (event.clientX - rect.left - rect.width / 2) * 0.22;
            ty = (event.clientY - rect.top - rect.height / 2) * 0.22;
            start();
        });

        element.addEventListener('pointerleave', () => {
            tx = 0;
            ty = 0;
            start();
        });
    });
}

/* ---------- 终章 · 落印 ---------- */

function initSeal() {
    const seal = document.querySelector('[data-seal]');
    const finale = document.querySelector('.finale');
    if (!seal || !finale) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
        seal.classList.add('stamped');
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            setTimeout(() => seal.classList.add('stamped'), 650);
            observer.disconnect();
        });
    }, { threshold: 0.5 });

    observer.observe(finale);
}

/* ---------- 署名 ---------- */

function initConsoleSignature() {
    console.log('%c流 CHICHI · 万物皆流 PANTA RHEI', 'font-size:22px;font-weight:900;color:#e8442e;');
    console.log('%c这不是一张网页，是一片实时演算的水。', 'color:#e3a455;letter-spacing:.2em;');
}

document.addEventListener('DOMContentLoaded', () => {
    applyProfile();
    initClock();
    initLoader();
    initFluid();
    initRipples();
    initCursor();
    initTouchPointer();
    initHeader();
    initMenu();
    initSmoothAnchors();
    initActiveNav();
    initScramble();
    initProgress();
    initReveal();
    initManifesto();
    initHorizontal();
    initTilt();
    initMagnetic();
    initSeal();
    initConsoleSignature();
});
