const profile = {
    siteName: 'CHICHI',
    github: 'https://github.com/dh666i',
    githubLabel: '@dh666i'
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    tx: window.innerWidth / 2,
    ty: window.innerHeight / 2,
    active: false
};

let hyperMode = false;

function applyProfile() {
    document.querySelectorAll('[data-site-name]').forEach((node) => {
        node.textContent = profile.siteName;
    });

    document.querySelectorAll('[data-github-link]').forEach((node) => {
        node.href = profile.github;
    });

    document.querySelectorAll('[data-github-text]').forEach((node) => {
        node.textContent = profile.githubLabel;
    });

    document.querySelectorAll('[data-year]').forEach((node) => {
        node.textContent = new Date().getFullYear();
    });
}

function initMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const menu = document.querySelector('#site-menu');
    if (!toggle || !menu) return;

    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        menu.classList.toggle('open', open);
        document.body.classList.toggle('menu-open', open);
    };

    toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
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
            const offset = window.innerWidth < 760 ? 92 : 110;
            window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
        });
    });
}

function initScrollMeter() {
    const meter = document.querySelector('[data-scroll-meter]');

    const update = () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = maxScroll <= 0 ? 0 : window.scrollY / maxScroll;
        document.documentElement.style.setProperty('--scroll-ratio', ratio.toFixed(4));
        if (meter) meter.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
}

function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
        items.forEach((item) => item.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -80px 0px'
    });

    items.forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * 50, 260)}ms`;
        observer.observe(item);
    });
}

function initTitleGhosts() {
    document.querySelectorAll('[data-split-title] span').forEach((span) => {
        span.dataset.ghost = span.textContent.trim();
    });
}

function initCursor() {
    if (prefersReducedMotion || window.matchMedia('(hover: none)').matches) return;

    const core = document.querySelector('[data-cursor]');
    const ring = document.querySelector('[data-cursor-ring]');
    const hoverables = 'a, button, [data-tilt], [data-spotlight]';

    window.addEventListener('pointermove', (event) => {
        pointer.tx = event.clientX;
        pointer.ty = event.clientY;
        pointer.active = true;
        document.documentElement.style.setProperty('--cursor-x', ((event.clientX / window.innerWidth) * 100).toFixed(2));
        document.documentElement.style.setProperty('--cursor-y', ((event.clientY / window.innerHeight) * 100).toFixed(2));
        document.documentElement.style.setProperty('--mx', (event.clientX / window.innerWidth - 0.5).toFixed(3));
        document.documentElement.style.setProperty('--my', (event.clientY / window.innerHeight - 0.5).toFixed(3));
    }, { passive: true });

    document.addEventListener('pointerover', (event) => {
        if (event.target.closest(hoverables)) document.body.classList.add('is-hovering');
    });

    document.addEventListener('pointerout', (event) => {
        if (event.target.closest(hoverables)) document.body.classList.remove('is-hovering');
    });

    const render = () => {
        pointer.x += (pointer.tx - pointer.x) * 0.32;
        pointer.y += (pointer.ty - pointer.y) * 0.32;

        if (core) core.style.transform = `translate(${pointer.tx}px, ${pointer.ty}px) translate(-50%, -50%)`;
        if (ring) ring.style.transform = `translate(${pointer.x}px, ${pointer.y}px) translate(-50%, -50%)`;
        requestAnimationFrame(render);
    };

    render();
}

function initSpotlight() {
    const elements = document.querySelectorAll('[data-spotlight], .button, .nav-links a, .menu-toggle');

    elements.forEach((element) => {
        element.addEventListener('pointermove', (event) => {
            const rect = element.getBoundingClientRect();
            element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
            element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
        });
    });
}

function initTilt() {
    if (prefersReducedMotion || window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('[data-tilt]').forEach((element) => {
        element.addEventListener('pointermove', (event) => {
            const rect = element.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            const lift = element.classList.contains('command-deck') ? -4 : -7;
            element.style.transform = `perspective(1100px) rotateX(${y * -8}deg) rotateY(${x * 10}deg) translate3d(0, ${lift}px, 0)`;
        });

        element.addEventListener('pointerleave', () => {
            element.style.transform = '';
        });
    });
}

function initMagnetic() {
    if (prefersReducedMotion || window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('.magnetic').forEach((element) => {
        let x = 0;
        let y = 0;
        let tx = 0;
        let ty = 0;
        let running = false;

        const animate = () => {
            x += (tx - x) * 0.22;
            y += (ty - y) * 0.22;
            element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) {
                requestAnimationFrame(animate);
            } else {
                running = false;
            }
        };

        element.addEventListener('pointermove', (event) => {
            const rect = element.getBoundingClientRect();
            tx = (event.clientX - rect.left - rect.width / 2) * 0.28;
            ty = (event.clientY - rect.top - rect.height / 2) * 0.28;
            if (!running) {
                running = true;
                requestAnimationFrame(animate);
            }
        });

        element.addEventListener('pointerleave', () => {
            tx = 0;
            ty = 0;
            if (!running) {
                running = true;
                requestAnimationFrame(animate);
            }
        });
    });
}

function initActiveNav() {
    const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    if (!sections.length) return;

    const update = () => {
        const current = sections.reduce((active, section) => {
            return section.getBoundingClientRect().top <= 180 ? section : active;
        }, sections[0]);

        links.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current.id}`);
        });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
}

function initIntensityToggle() {
    const button = document.querySelector('[data-intensity-toggle]');
    const motionState = document.querySelector('[data-motion-state]');
    if (!button) return;

    button.addEventListener('click', () => {
        hyperMode = !hyperMode;
        document.body.classList.toggle('hyper', hyperMode);
        button.textContent = hyperMode ? '关闭超频模式' : '切换能量模式';
        if (motionState) motionState.textContent = hyperMode ? 'Hyper' : 'High';
    });
}

function initCanvasField() {
    const canvas = document.querySelector('[data-field]');
    const particleCounter = document.querySelector('[data-live-particles]');
    const pointerState = document.querySelector('[data-pointer-state]');
    if (!canvas || prefersReducedMotion) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let lastScroll = window.scrollY;
    let scrollVelocity = 0;
    const palette = ['#f8ff4a', '#2df8ff', '#ff3df2', '#ff7a18', '#7c4dff'];

    const particleTarget = () => {
        const mobile = window.innerWidth < 760;
        const area = window.innerWidth * window.innerHeight;
        const base = mobile ? 68 : Math.round(area / 10500);
        return Math.min(mobile ? 92 : 168, Math.max(mobile ? 56 : 108, base));
    };

    const makeParticle = (index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 1.8 + 0.6,
        phase: Math.random() * Math.PI * 2,
        color: palette[index % palette.length]
    });

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 1.65);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const target = particleTarget();
        if (particles.length < target) {
            const start = particles.length;
            for (let i = start; i < target; i += 1) particles.push(makeParticle(i));
        } else {
            particles = particles.slice(0, target);
        }

        if (particleCounter) particleCounter.textContent = String(particles.length);
    };

    const draw = (time) => {
        const currentScroll = window.scrollY;
        scrollVelocity += (currentScroll - lastScroll - scrollVelocity) * 0.08;
        lastScroll = currentScroll;

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = hyperMode ? 'rgba(5, 4, 10, 0.18)' : 'rgba(5, 4, 10, 0.24)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';

        const forceRadius = hyperMode ? 220 : 170;
        const speed = hyperMode ? 1.45 : 1;

        particles.forEach((p, index) => {
            const angle = Math.sin((time * 0.00034) + p.phase + p.y * 0.004) + Math.cos((time * 0.00026) + p.x * 0.003);
            p.vx += Math.cos(angle + index) * 0.018 * speed;
            p.vy += Math.sin(angle - index) * 0.018 * speed + scrollVelocity * 0.0008;

            const dx = p.x - pointer.tx;
            const dy = p.y - pointer.ty;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < forceRadius) {
                const push = (1 - dist / forceRadius) * (hyperMode ? 1.35 : 0.78);
                p.vx += (dx / dist) * push;
                p.vy += (dy / dist) * push;
            }

            p.vx *= 0.972;
            p.vy *= 0.972;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -40) p.x = width + 40;
            if (p.x > width + 40) p.x = -40;
            if (p.y < -40) p.y = height + 40;
            if (p.y > height + 40) p.y = -40;

            const pulse = Math.sin(time * 0.003 + p.phase) * 0.45 + 1.15;
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.shadowBlur = hyperMode ? 22 : 14;
            ctx.shadowColor = p.color;
            ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0;
        const maxDist = hyperMode ? 148 : 118;
        for (let i = 0; i < particles.length; i += 1) {
            const a = particles[i];
            for (let j = i + 1; j < particles.length; j += 1) {
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.hypot(dx, dy);
                if (dist > maxDist) continue;
                const alpha = (1 - dist / maxDist) * (hyperMode ? 0.22 : 0.13);
                ctx.strokeStyle = `rgba(45, 248, 255, ${alpha})`;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }

        if (pointerState) pointerState.textContent = pointer.active ? 'Tracking' : 'Idle';
        requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
}

function initConsoleSignature() {
    console.log('%cCHICHI / WEB VISUAL LAB', 'font-size: 22px; font-weight: 900; color: #f8ff4a; background:#05040a; padding: 6px 10px;');
    console.log('Generative canvas + magnetic UI + scroll cinema.');
}

document.addEventListener('DOMContentLoaded', () => {
    applyProfile();
    initMenu();
    initSmoothAnchors();
    initScrollMeter();
    initReveal();
    initTitleGhosts();
    initCursor();
    initSpotlight();
    initTilt();
    initMagnetic();
    initActiveNav();
    initIntensityToggle();
    initCanvasField();
    initConsoleSignature();
});
