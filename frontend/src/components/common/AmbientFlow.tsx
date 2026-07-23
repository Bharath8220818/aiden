import React, { useEffect, useRef } from 'react';

interface AmbientFlowProps {
  /**
   * Density of particles: 'light' (default) | 'medium' | 'heavy'
   */
  density?: 'light' | 'medium' | 'heavy';
  /**
   * Color of particles in rgba format (only the rgb values, e.g. '6, 182, 212')
   * Default is the flow cyan.
   */
  color?: string;
  /**
   * Optional className for positioning
   */
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  life: number;
  maxLife: number;
  targetX: number;
  targetY: number;
  phase: 'born' | 'travel' | 'merge' | 'fade';
}

const PARTICLE_COUNTS = { light: 18, medium: 35, heavy: 60 };

const AmbientFlow: React.FC<AmbientFlowProps> = ({
  density = 'light',
  color = '6, 182, 212',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let count = PARTICLE_COUNTS[density];

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    window.addEventListener('resize', resize);

    // Track mouse for interactive response
    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    canvas.addEventListener('mousemove', handleMouse);
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Initialize particles
    const initParticles = () => {
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;
        const maxLife = 150 + Math.random() * 200;
        particles.push({
          x: startX,
          y: startY,
          size: 1 + Math.random() * 2,
          speedX: (Math.random() - 0.5) * 0.4,
          speedY: (Math.random() - 0.5) * 0.4,
          opacity: 0,
          life: Math.random() * maxLife,
          maxLife,
          targetX: startX + (Math.random() - 0.5) * 200,
          targetY: startY + (Math.random() - 0.5) * 200,
          phase: Math.random() > 0.7 ? 'born' as const : 'travel' as const,
        });
      }
      return particles;
    };

    particlesRef.current = initParticles();

    // Build connection graph (which particles connect to which)
    const connections: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      const neighbors = 1 + Math.floor(Math.random() * 2);
      for (let j = 0; j < neighbors; j++) {
        const target = Math.floor(Math.random() * count);
        if (target !== i && !connections.some(([a, b]) => (a === i && b === target) || (a === target && b === i))) {
          connections.push([i, target]);
        }
      }
    }

    let angle = 0;

    const animate = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      angle += 0.002;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const mouseRadius = 120;

      // Update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        if (p.life > p.maxLife) {
          // Reset particle
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = 0;
          p.phase = 'born';
          p.maxLife = 150 + Math.random() * 200;
          p.targetX = p.x + (Math.random() - 0.5) * 200;
          p.targetY = p.y + (Math.random() - 0.5) * 200;
          p.speedX = (Math.random() - 0.5) * 0.4;
          p.speedY = (Math.random() - 0.5) * 0.4;
        }

        // Phase lifecycle
        if (p.life < 20) {
          p.phase = 'born';
          p.opacity = p.life / 20;
        } else if (p.life > p.maxLife - 30) {
          p.phase = 'fade';
          p.opacity = Math.max(0, (p.maxLife - p.life) / 30);
        } else {
          p.phase = 'travel';
          p.opacity = 0.3 + Math.sin(angle + i) * 0.15;
        }

        // Drift toward target with gentle oscillation
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        p.x += dx * 0.002 + Math.sin(angle + i * 0.5) * 0.15;
        p.y += dy * 0.002 + Math.cos(angle + i * 0.3) * 0.15;

        // Mouse interaction — particles are attracted to cursor
        if (mouse.x > 0) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (dist < mouseRadius && dist > 0) {
            const force = (mouseRadius - dist) / mouseRadius;
            p.x += (mdx / dist) * force * 0.5;
            p.y += (mdy / dist) * force * 0.5;
            p.opacity = Math.min(1, p.opacity + force * 0.3);
          }
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
        ctx.fill();

        // Glow
        if (p.opacity > 0.3) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color}, ${p.opacity * 0.1})`;
          ctx.fill();
        }
      }

      // Draw connections
      for (const [a, b] of connections) {
        const p1 = particles[a];
        const p2 = particles[b];
        if (!p1 || !p2) continue;

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200 && dist > 0) {
          const opacity = (1 - dist / 200) * 0.15 * Math.min(p1.opacity, p2.opacity);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${color}, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [density, color]);

  return (
    <canvas
      ref={canvasRef}
      className={`ambient-flow-bg pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
};

export default AmbientFlow;
