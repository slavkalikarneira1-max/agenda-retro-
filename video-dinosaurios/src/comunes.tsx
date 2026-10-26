import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const W = 1080;
export const H = 1920;
export const SUELO = 1500; // línea del suelo donde se paran los personajes

/* Zona segura para Reels: los botones de Instagram tapan arriba (~250 px),
   abajo (~450 px) y la columna derecha (~170 px). Los textos viven dentro de
   x 150–930 y nunca bajan de y 1400. */
export const Texto: React.FC<{
	children: React.ReactNode;
	desde?: number;
	hasta?: number;
	y?: number;
	size?: number;
	color?: string;
	borde?: string;
}> = ({children, desde = 0, hasta = 99999, y = 470, size = 118, color = '#ffffff', borde = '#b77fd6'}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const pop = spring({frame: frame - desde, fps, config: {damping: 9, stiffness: 120}});
	const salida = interpolate(frame, [hasta - 8, hasta], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const flota = Math.sin(frame / 12) * 6;
	if (frame < desde || frame > hasta) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 150,
				width: 780,
				top: y,
				transform: `translateY(-50%) translateY(${flota}px) scale(${pop})`,
				opacity: salida,
				textAlign: 'center',
				fontFamily: 'Fredoka, sans-serif',
				fontWeight: 700,
				fontSize: size,
				lineHeight: 1.05,
				color,
				WebkitTextStroke: `${Math.round(size / 6)}px ${borde}`,
				paintOrder: 'stroke fill',
				textShadow: '0 10px 0 rgba(90, 60, 110, 0.18)',
				letterSpacing: 1,
			}}
		>
			{children}
		</div>
	);
};

export const Lienzo: React.FC<{children: React.ReactNode; fondo: string}> = ({children, fondo}) => (
	<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{position: 'absolute', inset: 0, background: fondo}}>
		{children}
	</svg>
);

export const Cielo: React.FC<{arriba: string; abajo: string; id: string}> = ({arriba, abajo, id}) => (
	<>
		<defs>
			<linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor={arriba} />
				<stop offset="1" stopColor={abajo} />
			</linearGradient>
		</defs>
		<rect width={W} height={H} fill={`url(#${id})`} />
	</>
);

export const Colinas: React.FC<{c1: string; c2: string; c3: string}> = ({c1, c2, c3}) => (
	<g>
		<ellipse cx={200} cy={1330} rx={520} ry={260} fill={c1} />
		<ellipse cx={900} cy={1360} rx={560} ry={280} fill={c1} />
		<ellipse cx={540} cy={1560} rx={900} ry={260} fill={c2} />
		<rect x={0} y={1560} width={W} height={H - 1560} fill={c3} />
		<ellipse cx={540} cy={1640} rx={900} ry={160} fill={c3} />
	</g>
);

// Saltito tierno: devuelve el desplazamiento vertical (negativo = arriba)
export const salto = (t: number, vel = 8, alto = 40, fase = 0) => -Math.abs(Math.sin(t / vel + fase)) * alto;
