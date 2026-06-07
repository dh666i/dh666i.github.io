const profile = {
    siteName: 'CHICHI',
    github: 'https://github.com/dh666i',
    githubLabel: '@dh666i'
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    tx: window.innerWidth / 2,
    ty: window.innerHeight / 2
};

function applyProfile() {
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
            const offset = window.innerWidth < 760 ? 92 : 112;
            window.scrollTo({ top: target.offsetTop - offset, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    });
}

function initScrollMeter() {
    const meter = document.querySelector('[data-scroll-meter]');

    const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max <= 0 ? 0 : window.scrollY / max;
        if (meter) meter.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
        document.documentElement.style.setProperty('--scroll-ratio', ratio.toFixed(4));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
}

function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

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
    }, { threshold: 0.14, rootMargin: '0px 0px -70px 0px' });

    items.forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * 42, 220)}ms`;
        observer.observe(item);
    });
}

function initPointer() {
    if (reduceMotion || window.matchMedia('(hover: none)').matches) return;

    const aura = document.querySelector('[data-cursor-aura]');
    const interactive = 'a, button, [data-tilt], [data-spotlight]';

    window.addEventListener('pointermove', (event) => {
        pointer.tx = event.clientX;
        pointer.ty = event.clientY;
        document.documentElement.style.setProperty('--cursor-x', ((event.clientX / window.innerWidth) * 100).toFixed(2));
        document.documentElement.style.setProperty('--cursor-y', ((event.clientY / window.innerHeight) * 100).toFixed(2));
        document.documentElement.style.setProperty('--mx', (event.clientX / window.innerWidth - 0.5).toFixed(3));
        document.documentElement.style.setProperty('--my', (event.clientY / window.innerHeight - 0.5).toFixed(3));
        if (aura) aura.style.opacity = '1';
    }, { passive: true });

    document.addEventListener('pointerover', (event) => {
        if (event.target.closest(interactive)) document.body.classList.add('is-hovering');
    });

    document.addEventListener('pointerout', (event) => {
        if (event.target.closest(interactive)) document.body.classList.remove('is-hovering');
    });

    document.addEventListener('pointerleave', () => {
        if (aura) aura.style.opacity = '0';
    });

    const animate = () => {
        pointer.x += (pointer.tx - pointer.x) * 0.18;
        pointer.y += (pointer.ty - pointer.y) * 0.18;
        if (aura) aura.style.transform = `translate(${pointer.x}px, ${pointer.y}px) translate(-50%, -50%)`;
        requestAnimationFrame(animate);
    };

    animate();
}

function initSpotlight() {
    document.querySelectorAll('[data-spotlight]').forEach((element) => {
        element.addEventListener('pointermove', (event) => {
            const rect = element.getBoundingClientRect();
            element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
            element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
        });
    });
}

function initTilt() {
    if (reduceMotion || window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('[data-tilt]').forEach((element) => {
        element.addEventListener('pointermove', (event) => {
            const rect = element.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            element.style.transform = `perspective(1000px) rotateX(${y * -3.5}deg) rotateY(${x * 4.5}deg) translateY(-2px)`;
        });

        element.addEventListener('pointerleave', () => {
            element.style.transform = '';
        });
    });
}

function initMagnetic() {
    if (reduceMotion || window.matchMedia('(hover: none)').matches) return;

    document.querySelectorAll('.magnetic').forEach((element) => {
        let x = 0;
        let y = 0;
        let tx = 0;
        let ty = 0;
        let raf = null;

        const animate = () => {
            x += (tx - x) * 0.2;
            y += (ty - y) * 0.2;
            element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            if (Math.abs(tx - x) > 0.08 || Math.abs(ty - y) > 0.08) {
                raf = requestAnimationFrame(animate);
            } else {
                raf = null;
            }
        };

        const start = () => {
            if (!raf) raf = requestAnimationFrame(animate);
        };

        element.addEventListener('pointermove', (event) => {
            const rect = element.getBoundingClientRect();
            tx = (event.clientX - rect.left - rect.width / 2) * 0.18;
            ty = (event.clientY - rect.top - rect.height / 2) * 0.18;
            start();
        });

        element.addEventListener('pointerleave', () => {
            tx = 0;
            ty = 0;
            start();
        });
    });
}

function initActiveNav() {
    const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    if (!sections.length) return;

    const update = () => {
        const current = sections.reduce((active, section) => {
            return section.getBoundingClientRect().top <= 170 ? section : active;
        }, sections[0]);

        links.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current.id}`);
        });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
}

function initInkCanvas() {
    const canvas = document.querySelector('[data-ink]');
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = 0;
    let height = 0;
    let dpr = 1;
    let points = [];

    const createPoints = () => {
        const mobile = window.innerWidth < 760;
        const count = mobile ? 42 : 78;
        points = Array.from({ length: count }, (_, index) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.22,
            vy: (Math.random() - 0.5) * 0.22,
            r: Math.random() * 1.8 + 0.6,
            phase: Math.random() * Math.PI * 2,
            warm: index % 3 === 0
        }));
    };

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        createPoints();
    };

    const draw = (time) => {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';

        points.forEach((point, index) => {
            const wave = Math.sin(time * 0.00045 + point.phase) * 0.18;
            point.vx += Math.cos(point.phase + time * 0.0002) * 0.004;
            point.vy += Math.sin(point.phase + time * 0.00018) * 0.004;

            const dx = point.x - pointer.tx;
            const dy = point.y - pointer.ty;
            const distance = Math.hypot(dx, dy) || 1;
            if (distance < 190) {
                const force = (1 - distance / 190) * 0.08;
                point.vx += (dx / distance) * force;
                point.vy += (dy / distance) * force;
            }

            point.vx *= 0.986;
            point.vy *= 0.986;
            point.x += point.vx + wave;
            point.y += point.vy;

            if (point.x < -30) point.x = width + 30;
            if (point.x > width + 30) point.x = -30;
            if (point.y < -30) point.y = height + 30;
            if (point.y > height + 30) point.y = -30;

            ctx.beginPath();
            ctx.fillStyle = point.warm ? 'rgba(200, 50, 31, 0.28)' : 'rgba(21, 18, 13, 0.18)';
            ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
            ctx.fill();

            for (let j = index + 1; j < points.length; j += 1) {
                const other = points[j];
                const lx = point.x - other.x;
                const ly = point.y - other.y;
                const len = Math.hypot(lx, ly);
                if (len > 128) continue;
                const alpha = (1 - len / 128) * 0.16;
                ctx.strokeStyle = point.warm || other.warm ? `rgba(200, 50, 31, ${alpha})` : `rgba(21, 18, 13, ${alpha})`;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(other.x, other.y);
                ctx.stroke();
            }
        });

        requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
}

function initConsoleSignature() {
    console.log('%cCHICHI｜网页造境实验室', 'font-size:20px;font-weight:800;color:#c8321f;');
    console.log('中文排版 / 轻量流场 / 克制交互');
}

document.addEventListener('DOMContentLoaded', () => {
    applyProfile();
    initMenu();
    initSmoothAnchors();
    initScrollMeter();
    initReveal();
    initPointer();
    initSpotlight();
    initTilt();
    initMagnetic();
    initActiveNav();
    initInkCanvas();
    initConsoleSignature();
});
