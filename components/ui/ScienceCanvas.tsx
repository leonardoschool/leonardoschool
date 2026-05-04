'use client';

/* eslint-disable sonarjs/pseudo-random -- Math.random() is acceptable for visual animations in this file */

import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  symbol: string;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  type: 'math' | 'chemistry' | 'biology' | 'physics';
  pulsePhase: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
}

const symbols = {
  math: ['∫', '∑', '∏', 'π', '∞', '√', '∂', '∇', 'α', 'β', 'γ', 'θ', 'λ', 'Δ', '∈', '∉', '⊂', '⊃', '∪', '∩'],
  chemistry: ['H₂O', 'CO₂', 'C₆H₁₂O₆', 'DNA', 'ATP', 'CH₄', 'NaCl', 'O₂', 'N₂', 'Ca²⁺', 'Fe³⁺', 'Cu', 'Zn', 'Mg'],
  biology: ['🧬', '🦠', '🔬', '⚗️', '💉', '🩺', '🫀', '🫁', '🧠', '🦴', '🔭'],
  physics: ['E=mc²', 'F=ma', 'v=s/t', 'P=F/A', 'W=F·s', 'λ', 'ℏ', '⚛️', '⚡', '🔆', '🌊']
};

const colors = {
  math: ['#D54F8A', '#E7418B'],
  chemistry: ['#68BCE8', '#42BFED'],
  biology: ['#B5B240', '#B6B21D'],
  physics: ['#EEB550', '#E7A03E']
};

export default function ScienceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const animationRef = useRef<number | undefined>(undefined);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = globalThis.innerWidth;
      canvas.height = globalThis.innerHeight;
    };
    resizeCanvas();
    globalThis.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      const types: Array<'math' | 'chemistry' | 'biology' | 'physics'> = ['math', 'chemistry', 'biology', 'physics'];
      
      for (let i = 0; i < 200; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const symbolArray = symbols[type];
        const colorArray = colors[type];
        
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 25 + 20,
          symbol: symbolArray[Math.floor(Math.random() * symbolArray.length)],
          color: colorArray[Math.floor(Math.random() * colorArray.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
          opacity: Math.random() * 0.6 + 0.3,
          type,
          pulsePhase: Math.random() * Math.PI * 2,
          orbitRadius: Math.random() * 50 + 30,
          orbitAngle: Math.random() * Math.PI * 2,
          orbitSpeed: (Math.random() - 0.5) * 0.02
        });
      }
    };
    initParticles();

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, i) => {
        // Mouse repulsion with explosion effect
        if (mouseRef.current.active) {
          const dx = particle.x - mouseRef.current.x;
          const dy = particle.y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 300;

          if (distance < maxDistance) {
            const force = (maxDistance - distance) / maxDistance;
            const angle = Math.atan2(dy, dx);
            particle.vx += Math.cos(angle) * force * 1.5;
            particle.vy += Math.sin(angle) * force * 1.5;
            particle.rotation += force * 0.5;
            particle.rotationSpeed += force * 0.1;
            particle.opacity = Math.min(1, particle.opacity + force * 0.5);
          }
        }

        // Update orbital motion
        particle.orbitAngle += particle.orbitSpeed;
        const orbitX = Math.cos(particle.orbitAngle) * particle.orbitRadius;
        const orbitY = Math.sin(particle.orbitAngle) * particle.orbitRadius;

        // Update pulse phase
        particle.pulsePhase += 0.05;

        // Update position with orbital influence
        particle.x += particle.vx + orbitX * 0.01;
        particle.y += particle.vy + orbitY * 0.01;
        particle.rotation += particle.rotationSpeed;

        // Damping
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.rotationSpeed *= 0.99;
        particle.opacity *= 0.995;
        if (particle.opacity < 0.3) particle.opacity = 0.3;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1;
          particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -1;
          particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        }

        // Draw connections
        particlesRef.current.forEach((otherParticle, j) => {
          if (i !== j) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 180) {
              ctx.beginPath();
              const connectionOpacity = Math.floor((1 - distance / 180) * 80);
              ctx.strokeStyle = `${particle.color}${connectionOpacity.toString(16).padStart(2, '0')}`;
              ctx.lineWidth = 2;
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
            }
          }
        });

        // Calculate pulsing size and opacity
        const pulse = Math.sin(particle.pulsePhase) * 0.3 + 1; // Oscillates between 0.7 and 1.3
        const dynamicSize = particle.size * pulse;
        const dynamicOpacity = particle.opacity * pulse;

        // Draw particle
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = dynamicOpacity;

        // Enhanced glow effect
        ctx.shadowBlur = 30 * pulse;
        ctx.shadowColor = particle.color;

        ctx.font = `bold ${dynamicSize}px Bahnschrift, sans-serif`;
        ctx.fillStyle = particle.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.symbol, 0, 0);

        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      globalThis.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div 
      className="absolute inset-0 w-full h-full"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: hovering ? 'pointer' : 'default' }}
      />
      
      {/* Floating DNA helix animation */}
      <div className="absolute top-1/4 left-1/4 animate-spin-slow opacity-10">
        <svg width="200" height="400" viewBox="0 0 100 200" className="text-red-500">
          <path
            d="M 30 0 Q 50 25, 30 50 T 30 100 T 30 150 T 30 200"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M 70 0 Q 50 25, 70 50 T 70 100 T 70 150 T 70 200"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      {/* Floating atom animation */}
      <div className="absolute bottom-1/4 right-1/4 animate-pulse opacity-10">
        <svg width="200" height="200" viewBox="0 0 100 100" className="text-blue-400">
          <circle cx="50" cy="50" r="5" fill="currentColor" />
          <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" />
          <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" style={{ animationDirection: 'reverse' }} />
          <ellipse cx="50" cy="50" rx="15" ry="40" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" />
        </svg>
      </div>
    </div>
  );
}
