/* ==========================================================
   迟迟 CHICHI V2 · 东方新工坊交互与水墨流体引擎
   ========================================================== */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = window.matchMedia('(max-width: 820px)');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const state = {
    theme: document.documentElement.getAttribute('data-theme') || 'dark',
    model: 'gpt',
    lang: 'curl'
};

/* ---------- 1. 墨夜 / 宣纸 双主题切换 ---------- */

function initTheme() {
    const btn = document.querySelector('[data-theme-toggle]');
    const label = document.querySelector('[data-theme-label]');
    const metaTheme = document.querySelector('meta[name="theme-color"]');

    const syncUI = (theme) => {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        if (label) label.textContent = theme === 'dark' ? '墨夜' : '宣纸';
        if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#121314' : '#f5f1e8');
        btn?.setAttribute('aria-label', theme === 'dark' ? '切换到宣纸主题' : '切换到墨夜主题');
        window.dispatchEvent(new CustomEvent('theme:change', { detail: theme }));
    };

    syncUI(state.theme);

    if (!btn) return;
    btn.addEventListener('click', () => {
        const next = state.theme === 'dark' ? 'light' : 'dark';
        syncUI(next);
        try { localStorage.setItem('chichi-theme', next); } catch {}
    });
}

/* ---------- 2. 页头、移动端菜单、导航高亮与滚动进度 ---------- */

function initNavigation() {
    const header = document.querySelector('[data-header]');
    const progressBar = document.querySelector('[data-progress]');
    const burger = document.querySelector('.burger');
    const menu = document.querySelector('[data-menu]');
    const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

    const onScroll = () => {
        const y = window.scrollY;
        if (header) header.classList.toggle('scrolled', y > 20);

        if (progressBar) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const ratio = max <= 0 ? 0 : clamp(y / max, 0, 1);
            progressBar.style.transform = `scaleX(${ratio})`;
        }

        const vh = window.innerHeight || 800;

        const current = sections.reduce((active, sec) => {
            return sec.getBoundingClientRect().top <= vh * 0.38 ? sec : active;
        }, null);
        navLinks.forEach((link) => {
            link.classList.toggle('active', Boolean(current) && link.getAttribute('href') === `#${current.id}`);
        });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    if (burger && menu) {
        const setOpen = (open) => {
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
            menu.inert = !open;
            menu.setAttribute('aria-hidden', String(!open));
            menu.classList.toggle('open', open);
            document.body.classList.toggle('menu-open', open);
            document.querySelector('main').inert = open;
            document.querySelector('footer').inert = open;
        };
        burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
        menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !menu.inert) {
                setOpen(false);
                burger.focus();
            }
        });
        narrow.addEventListener('change', () => setOpen(false));
    }

    document.querySelectorAll('[data-year]').forEach((el) => {
        el.textContent = new Date().getFullYear();
    });
}

/* ---------- 3. 滚动显影 & 宣言逐字点亮 & 朱砂落印 ---------- */

function initScrollEffects() {
    const revealEls = document.querySelectorAll('[data-reveal]');
    if ('IntersectionObserver' in window && !reduceMotion) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
        revealEls.forEach((el) => observer.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add('visible'));
    }

    // 宣言逐字点亮（无冗长 sticky 锁屏，随自然滚动丝滑点亮）
    const manifestoEl = document.querySelector('[data-manifesto-text]');
    if (manifestoEl && !reduceMotion) {
        const chars = [];
        const splitNode = (node, hot) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    Array.from(child.textContent).forEach((ch) => {
                        if (!ch.trim()) {
                            frag.appendChild(document.createTextNode(ch));
                            return;
                        }
                        const span = document.createElement('span');
                        span.className = hot ? 'ch hot' : 'ch';
                        span.textContent = ch;
                        frag.appendChild(span);
                        chars.push(span);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    splitNode(child, hot || child.classList.contains('hl'));
                }
            });
        };
        splitNode(manifestoEl, false);

        const updateManifesto = () => {
            const rect = manifestoEl.getBoundingClientRect();
            const vh = window.innerHeight || 800;
            const progress = clamp((vh * 0.85 - rect.top) / (vh * 0.62), 0, 1);
            const litCount = Math.round(progress * chars.length);
            chars.forEach((c, idx) => c.classList.toggle('lit', idx < litCount));
        };
        updateManifesto();
        window.addEventListener('scroll', updateManifesto, { passive: true });
    }

    // 终章朱砂落印
    const seal = document.querySelector('[data-seal]');
    if (seal) {
        if (reduceMotion || !('IntersectionObserver' in window)) {
            seal.classList.add('stamped');
        } else {
            const obs = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    setTimeout(() => seal.classList.add('stamped'), 250);
                    obs.disconnect();
                });
            }, { threshold: 0.4 });
            obs.observe(seal);
        }
    }
}

/* ---------- 4. 迟迟 API 交互展台 ---------- */

function initPlayground() {
    const modelBtns = document.querySelectorAll('[data-model]');
    const langBtns = document.querySelectorAll('[data-lang]');
    const codeView = document.querySelector('[data-code-view]');
    const copyBtn = document.querySelector('[data-copy-code]');
    const copyText = document.querySelector('[data-copy-code-text]');
    const runBtn = document.querySelector('[data-run-demo]');
    const outputModel = document.querySelector('[data-output-model]');
    const outputBody = document.querySelector('[data-output-body]');

    if (!codeView) return;

    const models = {
        gpt: {
            id: '<GPT_MODEL_ID>',
            prompt: '用一句话概括“好工具”的标准。',
            reply: '好的工具从不喧宾夺主——它把复杂留给自己，把顺手与灵感留给创造者。'
        },
        claude: {
            id: '<CLAUDE_MODEL_ID>',
            prompt: '帮我把这段状态管理重构得更易读。',
            reply: '已将分散的副作用收敛为纯状态机，并补充了资源释放钩子。修改后逻辑一目了然，且无内存泄漏风险。'
        },
        gemini: {
            id: '<GEMINI_MODEL_ID>',
            prompt: '总结这份 40 页架构文档的核心瓶颈。',
            reply: '全文核心瓶颈集中在三处：1) 高频重绘未做帧率节流；2) 纹理重建未释放旧缓冲；3) 首屏阻塞时间过长。'
        },
        grok: {
            id: '<GROK_MODEL_ID>',
            prompt: '独立开发者做产品最容易踩什么坑？',
            reply: '花两周雕琢没人点开的过场动画，却只花两分钟写核心功能入口。先让产品能用，再让它惊艳。'
        }
    };

    const getRawCode = (modelKey, lang) => {
        const m = models[modelKey];
        if (lang === 'curl') {
            return [
                'curl https://chichiapi.cn/v1/chat/completions \\',
                '  -H "Authorization: Bearer $CHICHI_API_KEY" \\',
                '  -H "Content-Type: application/json" \\',
                "  -d '{",
                `    "model": "${m.id}",`,
                '    "stream": true,',
                '    "messages": [',
                `      { "role": "user", "content": "${m.prompt}" }`,
                '    ]',
                "  }'"
            ].join('\n');
        }
        if (lang === 'python') {
            return `import os
from openai import OpenAI

client = OpenAI(
    base_url="https://chichiapi.cn/v1",
    api_key=os.environ["CHICHI_API_KEY"]
)

stream = client.chat.completions.create(
    model="${m.id}",
    messages=[{"role": "user", "content": "${m.prompt}"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`;
        }
        return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://chichiapi.cn/v1",
  apiKey: process.env.CHICHI_API_KEY,
});

const stream = await client.chat.completions.create({
  model: "${m.id}",
  messages: [{ role: "user", content: "${m.prompt}" }],
  stream: true,
});
for await (const part of stream) {
  process.stdout.write(part.choices[0]?.delta?.content ?? "");
}`;
    };

    const highlight = (code) => {
        return code
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>')
            .replace(/\b(from|import|const|for|await|of|in|new|curl)\b/g, '<span class="tok-kw">$1</span>')
            .replace(/\b(OpenAI|create|print|write)\b/g, '<span class="tok-fn">$1</span>');
    };

    let streamTimer = null;

    const renderCode = () => {
        const raw = getRawCode(state.model, state.lang);
        codeView.innerHTML = highlight(raw);
        if (outputModel) outputModel.textContent = models[state.model].id;
    };

    const runStreamDemo = () => {
        if (!outputBody) return;
        clearInterval(streamTimer);
        const text = models[state.model].reply;
        if (reduceMotion) {
            outputBody.textContent = text;
            return;
        }
        let i = 0;
        outputBody.innerHTML = '<span class="stream-cursor"></span>';
        streamTimer = setInterval(() => {
            i += 1;
            const slice = text.slice(0, i);
            outputBody.innerHTML = `${slice}<span class="stream-cursor"></span>`;
            if (i >= text.length) {
                clearInterval(streamTimer);
                outputBody.textContent = text;
            }
        }, 38);
    };

    modelBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            state.model = btn.dataset.model;
            modelBtns.forEach((b) => {
                const active = b === btn;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-pressed', String(active));
            });
            renderCode();
            runStreamDemo();
        });
    });

    langBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            state.lang = btn.dataset.lang;
            langBtns.forEach((b) => {
                const active = b === btn;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-pressed', String(active));
            });
            renderCode();
        });
    });

    if (runBtn) runBtn.addEventListener('click', runStreamDemo);

    if (copyBtn) {
        let timer;
        copyBtn.addEventListener('click', async () => {
            const raw = getRawCode(state.model, state.lang);
            const ok = await copyTextSafe(raw);
            if (!ok) return;
            copyBtn.classList.add('copied');
            if (copyText) copyText.textContent = '已复制';
            showToast('已复制 API 示例代码');
            clearTimeout(timer);
            timer = setTimeout(() => {
                copyBtn.classList.remove('copied');
                if (copyText) copyText.textContent = '复制';
            }, 2000);
        });
    }

    renderCode();
}

/* ---------- 5. 公开项目分类筛选 & 聚光灯边框 ---------- */

function initProjects() {
    const filterBtns = document.querySelectorAll('[data-filter]');
    const cards = document.querySelectorAll('.proj-card');

    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.filter;
            document.querySelector('[data-project-grid]').toggleAttribute('data-filtered', cat !== 'all');
            filterBtns.forEach((b) => {
                const active = b === btn;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-pressed', String(active));
            });
            cards.forEach((card) => {
                const match = cat === 'all' || card.dataset.category === cat;
                card.classList.toggle('is-hidden', !match);
            });
        });
    });

    // 聚光灯微光追踪（替代沉重的 3D 倾斜与自定义光标）
    if (!reduceMotion && !window.matchMedia('(hover: none)').matches) {
        document.querySelectorAll('[data-spotlight]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const rect = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${(e.clientX - rect.left).toFixed(0)}px`);
                el.style.setProperty('--my', `${(e.clientY - rect.top).toFixed(0)}px`);
            }, { passive: true });
        });
    }
}

/* ---------- 6. 可展开手风琴 FAQ ---------- */

function initAccordion() {
    const items = document.querySelectorAll('.acc-item');
    items.forEach((item) => {
        const trigger = item.querySelector('.acc-trigger');
        if (!trigger) return;
        item.querySelector('.acc-panel').inert = !item.classList.contains('is-open');
        trigger.addEventListener('click', () => {
            const isOpen = item.classList.contains('is-open');
            items.forEach((other) => {
                other.classList.remove('is-open');
                other.querySelector('.acc-panel').inert = true;
                other.querySelector('.acc-trigger')?.setAttribute('aria-expanded', 'false');
            });
            if (!isOpen) {
                item.classList.add('is-open');
                item.querySelector('.acc-panel').inert = false;
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

/* ---------- 7. 联系方式印笺复制与兜底 ---------- */

let toastTimer = null;
function showToast(msg) {
    const toast = document.querySelector('.copy-toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

async function copyTextSafe(value) {
    try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.append(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove();
        if (ok) return true;

        const dialog = document.querySelector('.copy-dialog');
        if (dialog) {
            const input = dialog.querySelector('textarea');
            if (input) {
                input.value = value;
                dialog.showModal();
                input.select();
            }
        }
        return false;
    }
}

function initContactCopy() {
    document.querySelectorAll('[data-copy]').forEach((btn) => {
        let timer;
        btn.addEventListener('click', async () => {
            const value = btn.dataset.copy;
            const label = btn.dataset.copyLabel || '内容';
            const ok = await copyTextSafe(value);
            if (!ok) return;
            btn.classList.add('copied');
            showToast(`已复制${label}：${value}`);
            clearTimeout(timer);
            timer = setTimeout(() => btn.classList.remove('copied'), 2000);
        });
    });
}

/* ---------- 8. 优化版 WebGL 水墨流体引擎（修复显存泄漏 + 双主题色板） ---------- */

function initFluid() {
    const canvas = document.querySelector('[data-fluid]');
    if (!canvas || reduceMotion) return;

    const params = {
        simRes: narrow.matches ? 80 : 128,
        dyeRes: narrow.matches ? 256 : 480,
        densityDissipation: 0.85,
        velocityDissipation: 0.35,
        pressureDissipation: 0.84,
        pressureIterations: narrow.matches ? 12 : 18,
        curl: 22,
        splatRadius: 0.0032,
        splatForce: 4600
    };

    let gl = canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false });
    const isWebGL2 = Boolean(gl);
    if (!gl) {
        gl = canvas.getContext('webgl', { alpha: false, depth: false, stencil: false, antialias: false });
    }
    if (!gl) { canvas.remove(); return; }

    let halfFloat = null;
    let linearFilter = false;
    if (isWebGL2) {
        linearFilter = true;
        if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) {
            canvas.remove(); return;
        }
    } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        linearFilter = Boolean(gl.getExtension('OES_texture_half_float_linear'));
        if (!halfFloat) { canvas.remove(); return; }
    }

    const texType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    const internalFormat = isWebGL2 ? gl.RGBA16F : gl.RGBA;
    const filtering = linearFilter ? gl.LINEAR : gl.NEAREST;

    const baseVert = `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv, vL, vR, vT, vB;
        uniform vec2 texelSize;
        void main() {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    const splatFrag = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio, radius;
        uniform vec3 color;
        uniform vec2 point;
        void main() {
            vec2 p = vUv - point;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
        }
    `;

    const advectFrag = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uVelocity, uSource;
        uniform vec2 texelSize;
        uniform float dt, dissipation;
        void main() {
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
            gl_FragColor.a = 1.0;
        }
    `;

    const divFrag = `
        precision mediump float;
        varying highp vec2 vUv, vL, vR, vT, vB;
        uniform sampler2D uVelocity;
        void main() {
            float L = texture2D(uVelocity, vL).x, R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y, B = texture2D(uVelocity, vB).y;
            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
            if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
            gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
        }
    `;

    const curlFrag = `
        precision mediump float;
        varying highp vec2 vUv, vL, vR, vT, vB;
        uniform sampler2D uVelocity;
        void main() {
            float L = texture2D(uVelocity, vL).y, R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x, B = texture2D(uVelocity, vB).x;
            gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
        }
    `;

    const vortFrag = `
        precision highp float;
        varying vec2 vUv, vL, vR, vT, vB;
        uniform sampler2D uVelocity, uCurl;
        uniform float curl, dt;
        void main() {
            float L = texture2D(uCurl, vL).x, R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x, B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
            vec2 vel = clamp(texture2D(uVelocity, vUv).xy + force * dt, -1000.0, 1000.0);
            gl_FragColor = vec4(vel, 0.0, 1.0);
        }
    `;

    const pressFrag = `
        precision mediump float;
        varying highp vec2 vUv, vL, vR, vT, vB;
        uniform sampler2D uPressure, uDivergence;
        void main() {
            float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
            float d = texture2D(uDivergence, vUv).x;
            gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
        }
    `;

    const gradFrag = `
        precision mediump float;
        varying highp vec2 vUv, vL, vR, vT, vB;
        uniform sampler2D uPressure, uVelocity;
        void main() {
            float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x;
            vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
            gl_FragColor = vec4(vel, 0.0, 1.0);
        }
    `;

    const clearFrag = `
        precision mediump float;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main() { gl_FragColor = value * texture2D(uTexture, vUv); }
    `;

    // 双主题显示着色器：墨夜（深黑底+朱砂金微光）与宣纸（宣纸米白底+淡墨朱砂晕染）
    const displayFrag = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float uLight;
        void main() {
            vec3 dye = texture2D(uTexture, vUv).rgb * 1.15;
            dye = dye / (1.0 + dot(dye, vec3(0.35)));

            vec3 darkBg = vec3(0.031, 0.027, 0.047);
            darkBg += vec3(0.065, 0.02, 0.018) * smoothstep(1.1, 0.0, distance(vUv, vec2(0.85, 0.85)));
            vec3 darkCol = darkBg + dye * 0.72;

            vec3 paperBg = vec3(0.961, 0.945, 0.910);
            vec3 inkTint = vec3(0.18, 0.14, 0.12) * (dye.r * 0.55 + dye.g * 0.35) + vec3(0.75, 0.22, 0.14) * dye.r * 0.38;
            vec3 lightCol = clamp(paperBg - inkTint * 0.55, 0.0, 1.0);

            gl_FragColor = vec4(mix(darkCol, lightCol, uLight), 1.0);
        }
    `;

    const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };

    const vs = compile(gl.VERTEX_SHADER, baseVert);
    if (!vs) { canvas.remove(); return; }

    const makeProg = (frag) => {
        const fs = compile(gl.FRAGMENT_SHADER, frag);
        if (!fs) return null;
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
        const uniforms = {};
        const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i += 1) {
            const name = gl.getActiveUniform(p, i).name;
            uniforms[name] = gl.getUniformLocation(p, name);
        }
        return { program: p, uniforms };
    };

    const progs = {
        splat: makeProg(splatFrag),
        advect: makeProg(advectFrag),
        div: makeProg(divFrag),
        curl: makeProg(curlFrag),
        vort: makeProg(vortFrag),
        press: makeProg(pressFrag),
        grad: makeProg(gradFrag),
        clear: makeProg(clearFrag),
        display: makeProg(displayFrag)
    };
    if (Object.values(progs).some((p) => !p)) { canvas.remove(); return; }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

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

    const createFBO = (w, h) => {
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, gl.RGBA, texType, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return {
            texture, fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
            attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; },
            dispose() { gl.deleteTexture(texture); gl.deleteFramebuffer(fbo); }
        };
    };

    const createDoubleFBO = (w, h) => {
        let a = createFBO(w, h), b = createFBO(w, h);
        return {
            width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h,
            get read() { return a; }, get write() { return b; },
            swap() { const t = a; a = b; b = t; },
            dispose() { a.dispose(); b.dispose(); }
        };
    };

    let velocity, dye, divergence, curl, pressure;

    const disposeAll = () => {
        velocity?.dispose(); dye?.dispose(); divergence?.dispose(); curl?.dispose(); pressure?.dispose();
    };

    const initFBOs = () => {
        disposeAll();
        const aspect = Math.max(gl.drawingBufferWidth / gl.drawingBufferHeight, gl.drawingBufferHeight / gl.drawingBufferWidth) || 1;
        const res = (base) => gl.drawingBufferWidth > gl.drawingBufferHeight
            ? { w: Math.round(base * aspect), h: base }
            : { w: base, h: Math.round(base * aspect) };
        const sim = res(params.simRes);
        const dRes = res(params.dyeRes);
        velocity = createDoubleFBO(sim.w, sim.h);
        dye = createDoubleFBO(dRes.w, dRes.h);
        divergence = createFBO(sim.w, sim.h);
        curl = createFBO(sim.w, sim.h);
        pressure = createDoubleFBO(sim.w, sim.h);
    };

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, narrow.matches ? 1 : 1.2);
        const w = Math.max(2, Math.floor(window.innerWidth * dpr * 0.55));
        const h = Math.max(2, Math.floor(window.innerHeight * dpr * 0.55));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            initFBOs();
        }
    };

    // 收敛色板：仅保留朱砂红、暗金与暖墨灰，摒弃杂色
    const palette = [
        [0.82, 0.19, 0.12],
        [0.78, 0.52, 0.22],
        [0.52, 0.14, 0.11]
    ];
    let colorIdx = 0;
    const pickColor = (gain) => {
        colorIdx = (colorIdx + 1) % palette.length;
        const c = palette[colorIdx];
        return [c[0] * gain, c[1] * gain, c[2] * gain];
    };

    const splat = (x, y, dx, dy, color) => {
        const p = progs.splat;
        gl.useProgram(p.program);
        gl.uniform1i(p.uniforms.uTarget, velocity.read.attach(0));
        gl.uniform1f(p.uniforms.aspectRatio, canvas.width / canvas.height);
        gl.uniform2f(p.uniforms.point, x, y);
        gl.uniform3f(p.uniforms.color, dx, dy, 0);
        let r = params.splatRadius;
        if (canvas.width > canvas.height) r *= canvas.width / canvas.height;
        gl.uniform1f(p.uniforms.radius, r);
        blit(velocity.write); velocity.swap();
        gl.uniform1i(p.uniforms.uTarget, dye.read.attach(0));
        gl.uniform3f(p.uniforms.color, color[0], color[1], color[2]);
        blit(dye.write); dye.swap();
    };

    const step = (dt) => {
        gl.useProgram(progs.curl.program);
        gl.uniform2f(progs.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(progs.curl.uniforms.uVelocity, velocity.read.attach(0));
        blit(curl);

        gl.useProgram(progs.vort.program);
        gl.uniform2f(progs.vort.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(progs.vort.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(progs.vort.uniforms.uCurl, curl.attach(1));
        gl.uniform1f(progs.vort.uniforms.curl, params.curl);
        gl.uniform1f(progs.vort.uniforms.dt, dt);
        blit(velocity.write); velocity.swap();

        gl.useProgram(progs.div.program);
        gl.uniform2f(progs.div.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(progs.div.uniforms.uVelocity, velocity.read.attach(0));
        blit(divergence);

        gl.useProgram(progs.clear.program);
        gl.uniform1i(progs.clear.uniforms.uTexture, pressure.read.attach(0));
        gl.uniform1f(progs.clear.uniforms.value, params.pressureDissipation);
        blit(pressure.write); pressure.swap();

        gl.useProgram(progs.press.program);
        gl.uniform2f(progs.press.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(progs.press.uniforms.uDivergence, divergence.attach(0));
        for (let i = 0; i < params.pressureIterations; i += 1) {
            gl.uniform1i(progs.press.uniforms.uPressure, pressure.read.attach(1));
            blit(pressure.write); pressure.swap();
        }

        gl.useProgram(progs.grad.program);
        gl.uniform2f(progs.grad.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(progs.grad.uniforms.uPressure, pressure.read.attach(0));
        gl.uniform1i(progs.grad.uniforms.uVelocity, velocity.read.attach(1));
        blit(velocity.write); velocity.swap();

        gl.useProgram(progs.advect.program);
        gl.uniform2f(progs.advect.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        const vid = velocity.read.attach(0);
        gl.uniform1i(progs.advect.uniforms.uVelocity, vid);
        gl.uniform1i(progs.advect.uniforms.uSource, vid);
        gl.uniform1f(progs.advect.uniforms.dt, dt);
        gl.uniform1f(progs.advect.uniforms.dissipation, params.velocityDissipation);
        blit(velocity.write); velocity.swap();

        gl.uniform1i(progs.advect.uniforms.uVelocity, velocity.read.attach(0));
        gl.uniform1i(progs.advect.uniforms.uSource, dye.read.attach(1));
        gl.uniform1f(progs.advect.uniforms.dissipation, params.densityDissipation);
        blit(dye.write); dye.swap();
    };

    let lightMix = state.theme === 'light' ? 1 : 0;
    let targetLight = lightMix;
    window.addEventListener('theme:change', (e) => {
        targetLight = e.detail === 'light' ? 1 : 0;
    });

    let px = window.innerWidth * 0.5, py = window.innerHeight * 0.5;
    let tx = px, ty = py;
    let lastTime = performance.now();
    let inView = true;
    let frameId = 0;
    let idle = 0;

    window.addEventListener('pointermove', (e) => {
        tx = e.clientX; ty = e.clientY;
    }, { passive: true });

    const frame = (now) => {
        frameId = 0;
        if (!inView || document.hidden) return;
        const dt = clamp((now - lastTime) / 1000, 0, 0.0166);
        lastTime = now;

        const dx = tx - px, dy = ty - py;
        px = tx; py = ty;
        const speed = Math.hypot(dx, dy);

        if (speed > 1.0) {
            idle = 0;
            splat(
                tx / window.innerWidth,
                1 - ty / window.innerHeight,
                (dx / window.innerWidth) * params.splatForce,
                (-dy / window.innerHeight) * params.splatForce,
                pickColor(clamp(speed / 90, 0.1, 0.34))
            );
        } else {
            idle += dt;
            if (idle > 1.5 && Math.floor(now / 1200) !== Math.floor((now - dt * 1000) / 1200)) {
                const t = now * 0.00018;
                splat(0.55 + 0.25 * Math.sin(t), 0.5 + 0.22 * Math.cos(t * 1.2), Math.cos(t) * 28, Math.sin(t) * 22, pickColor(0.22));
            }
        }

        lightMix += (targetLight - lightMix) * 0.12;
        step(dt);

        gl.useProgram(progs.display.program);
        gl.uniform1i(progs.display.uniforms.uTexture, dye.read.attach(0));
        gl.uniform1f(progs.display.uniforms.uLight, lightMix);
        blit(null);

        frameId = requestAnimationFrame(frame);
    };

    function syncFrames() {
        cancelAnimationFrame(frameId);
        if (inView && !document.hidden) {
            lastTime = performance.now();
            frameId = requestAnimationFrame(frame);
        }
    }
    document.addEventListener('visibilitychange', syncFrames);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            syncFrames();
        }).observe(canvas);
    }

    let rTimer;
    window.addEventListener('resize', () => {
        clearTimeout(rTimer);
        rTimer = setTimeout(resize, 180);
    });

    resize();
    // 初始两笔柔和墨韵
    splat(0.76, 0.68, -260, -120, pickColor(0.65));
    splat(0.26, 0.34, 220, 140, pickColor(0.5));
    syncFrames();
}

/* ---------- 启动 ---------- */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initScrollEffects();
    initPlayground();
    initProjects();
    initAccordion();
    initContactCopy();
    try {
        initFluid();
    } catch (err) {
        document.querySelector('[data-fluid]')?.remove();
        console.warn('Fluid background disabled:', err);
    }
});
