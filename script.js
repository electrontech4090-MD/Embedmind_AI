/**
 * EMBEDMIND-AI - Dynamic Cyber Vortex & Matrix Text Deciphering
 */

document.addEventListener('DOMContentLoaded', () => {
    initVortexCanvas();
    initMatrixTextDecipher();
    init3DTilt();
});

/* ==========================================================================
   1. 3D PARTICLE VORTEX & LASER SHOCKWAVE CANVAS
   ========================================================================== */
function initVortexCanvas() {
    const canvas = document.getElementById('vortexCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let particles = [];
    let shockwaves = [];
    const particleCount = 140;

    let mouse = { x: width / 2, y: height / 2 };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('click', (e) => {
        // Trigger laser shockwave
        shockwaves.push({
            x: e.clientX,
            y: e.clientY,
            radius: 10,
            maxRadius: Math.max(width, height) * 0.5,
            alpha: 1,
            color: '#ff003c'
        });
    });

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    class VortexParticle {
        constructor() {
            this.reset();
        }

        reset() {
            this.angle = Math.random() * Math.PI * 2;
            this.radius = Math.random() * (Math.max(width, height) * 0.45) + 50;
            this.speed = (Math.random() * 0.008 + 0.002) * (Math.random() > 0.5 ? 1 : -1);
            this.size = Math.random() * 2.5 + 1;
            this.alpha = Math.random() * 0.6 + 0.2;
            this.z = Math.random() * 2; // depth
            this.color = Math.random() > 0.25 ? '#ff003c' : '#ff4d6d';
        }

        update() {
            this.angle += this.speed;
            
            // Mouse gravity attraction
            const centerX = width / 2 + (mouse.x - width / 2) * 0.05;
            const centerY = height / 2 + (mouse.y - height / 2) * 0.05;

            this.x = centerX + Math.cos(this.angle) * this.radius;
            this.y = centerY + Math.sin(this.angle) * (this.radius * 0.5); // Elliptical 3D tilt
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * this.z, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.restore();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new VortexParticle());
    }

    function animate() {
        ctx.fillStyle = 'rgba(3, 1, 2, 0.25)'; // Motion trail blur
        ctx.fillRect(0, 0, width, height);

        // Render & Update Shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += 12;
            sw.alpha -= 0.02;

            if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
                shockwaves.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = sw.alpha;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = sw.color;
            ctx.stroke();
            ctx.restore();
        }

        // Render Vortex Particles & Connecting Energy Links
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            // Connect nearby particles with laser links
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 85) {
                    ctx.save();
                    const lineAlpha = (1 - dist / 85) * 0.15;
                    ctx.strokeStyle = `rgba(255, 0, 60, ${lineAlpha})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}

/* ==========================================================================
   2. MATRIX TEXT DECIPHERING ANIMATION
   ========================================================================== */
function initMatrixTextDecipher() {
    const textElement = document.getElementById('brandText');
    if (!textElement) return;

    const letters = "01010101#$@!&%*ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const targetText = textElement.dataset.value;
    let iteration = 0;
    let interval = null;

    function runDecipher() {
        clearInterval(interval);
        iteration = 0;

        interval = setInterval(() => {
            textElement.innerText = targetText
                .split("")
                .map((letter, index) => {
                    if (index < iteration) {
                        return targetText[index];
                    }
                    return letters[Math.floor(Math.random() * letters.length)];
                })
                .join("");

            if (iteration >= targetText.length) {
                clearInterval(interval);
            }

            iteration += 1 / 3;
        }, 30);
    }

    // Run on page load
    runDecipher();

    // Re-run on hover
    textElement.parentElement.addEventListener('mouseenter', runDecipher);
}

/* ==========================================================================
   3. 3D CARD TILT ON MOUSE MOVE
   ========================================================================== */
function init3DTilt() {
    const wrapper = document.getElementById('brandWrapper');
    if (!wrapper) return;

    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        wrapper.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    });
}
