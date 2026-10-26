import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Cielo, Colinas, Lienzo, salto, Texto} from './comunes';
import {
	Copo,
	Cuellilargo,
	Estrella,
	Flor,
	Helecho,
	Nota,
	Nube,
	Pajarito,
	Palmera,
	Pos,
	Rexito,
	Sol,
	Tricerita,
} from './personajes';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Colores de los dinos (pastel)
const VERDE = {color: '#9edbb0', panza: '#e3f7e6', manchas: '#ffffff'};
const ROSA = {color: '#ffb3c7', panza: '#ffe4ec', manchas: '#c9a7ff'};
const LILA = {color: '#c4b3ff', panza: '#ece6ff', manchas: '#ffe6a7'};

/* ========== Escena 1: dinosaurios jugando en la selva ========== */
export const Escena1: React.FC = () => {
	const t = useCurrentFrame();
	return (
		<AbsoluteFill>
			<Lienzo fondo="#bfe6ff">
				<Cielo id="c1" arriba="#a9dcff" abajo="#fde2f0" />
				<Pos x={830} y={720}>
					<Sol t={t} />
				</Pos>
				<Pos x={180 + t * 0.4} y={760} s={0.8}>
					<Nube />
				</Pos>
				<Colinas c1="#bfeacb" c2="#a4dfb6" c3="#8fd3a3" />
				<Pos x={110} y={1420} s={1.05}>
					<Palmera t={t} />
				</Pos>
				<Pos x={1000} y={1440} s={0.9} flip>
					<Palmera t={t + 20} />
				</Pos>
				<Pos x={250} y={1610} s={1.1}>
					<Helecho />
				</Pos>
				<Pos x={880} y={1640} s={1.2}>
					<Helecho color="#b9ecc4" />
				</Pos>
				{/* jugando: el cuellilargo se mece, rexito salta, tricerita corre de un lado a otro */}
				<Pos x={380} y={1500 + Math.sin(t / 10) * 4} s={1.15}>
					<Cuellilargo {...VERDE} t={t} mx={0.6} boca={Math.floor(t / 30) % 2 === 0} />
				</Pos>
				<Pos x={790} y={1520 + salto(t, 7, 70)} s={0.95}>
					<Rexito {...ROSA} t={t} mx={-0.6} boca />
				</Pos>
				<Pos x={560 + Math.sin(t / 25) * 140} y={1610} s={0.75} flip={Math.cos(t / 25) > 0}>
					<Tricerita {...LILA} t={t} />
				</Pos>
				{[...Array(6)].map((_, i) => (
					<Pos key={i} x={160 + i * 150} y={1820 - ((t * 2 + i * 70) % 120)} opacity={0.7}>
						<Flor s={0.7} color={i % 2 ? '#ffd1a8' : '#ffb4c8'} />
					</Pos>
				))}
			</Lienzo>
			<Texto desde={4} size={112}>
				¿Adiós,
				<br />
				dinosaurios?
			</Texto>
		</AbsoluteFill>
	);
};

/* ========== Escena 2: el asteroide cruza el cielo ========== */
const Asteroide: React.FC<{t: number}> = ({t}) => (
	<g>
		{/* estela de estrellita fugaz */}
		<defs>
			<linearGradient id="estela" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stopColor="#fff6c9" stopOpacity={0} />
				<stop offset="0.6" stopColor="#ffd1ec" stopOpacity={0.7} />
				<stop offset="1" stopColor="#fff6c9" stopOpacity={1} />
			</linearGradient>
			<radialGradient id="brillo">
				<stop offset="0" stopColor="#fff6c9" stopOpacity={0.9} />
				<stop offset="1" stopColor="#fff6c9" stopOpacity={0} />
			</radialGradient>
		</defs>
		<path d="M-520 -40 Q-260 -30 0 -55 L0 55 Q-260 30 -520 40 Z" fill="url(#estela)" />
		{[...Array(7)].map((_, i) => (
			<Pos key={i} x={-90 - i * 65} y={Math.sin(t / 4 + i) * 30} rot={t * 4 + i * 30} opacity={1 - i / 8}>
				<Estrella r={16 - i} color={i % 2 ? '#ffd1ec' : '#fff6c9'} />
			</Pos>
		))}
		<circle r={130} fill="url(#brillo)" />
		<g transform={`rotate(${t * 2})`}>
			<path d="M-62 -10 Q-58 -60 -5 -62 Q55 -66 64 -12 Q72 45 18 60 Q-40 70 -62 -10 Z" fill="#cdb8e6" />
			<circle cx={-20} cy={-20} r={13} fill="#b39dd1" />
			<circle cx={25} cy={15} r={18} fill="#b39dd1" />
			<circle cx={-15} cy={30} r={8} fill="#b39dd1" />
			<circle cx={20} cy={-35} r={7} fill="#e9dcf7" />
		</g>
	</g>
);

export const Escena2: React.FC = () => {
	const t = useCurrentFrame();
	const avance = interpolate(t, [20, 225], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
	const ax = -200 + avance * 1500;
	const ay = 640 + avance * 380 - Math.sin(avance * Math.PI) * 120;
	// los dinos siguen la roca con los ojitos
	const mirar = (x: number) => Math.max(-1, Math.min(1, (ax - x) / 400));
	return (
		<AbsoluteFill>
			<Lienzo fondo="#d6c8ff">
				<Cielo id="c2" arriba="#b9a8f0" abajo="#ffd6e0" />
				{[...Array(18)].map((_, i) => (
					<Pos key={i} x={(i * 263) % 1080} y={620 + ((i * 137) % 520)} opacity={0.5 + 0.5 * Math.sin(t / 6 + i)}>
						<Estrella r={8 + (i % 3) * 4} />
					</Pos>
				))}
				<Colinas c1="#c7d9d0" c2="#b0d6bf" c3="#9cc9ad" />
				<Pos x={110} y={1420} s={1.05}>
					<Palmera t={t} />
				</Pos>
				<Pos x={1000} y={1440} s={0.9} flip>
					<Palmera t={t + 20} />
				</Pos>
				<Pos x={ax} y={ay} s={1.1}>
					<Asteroide t={t} />
				</Pos>
				<Pos x={380} y={1500} s={1.15}>
					<Cuellilargo {...VERDE} t={t} mx={mirar(220)} my={-1} />
				</Pos>
				<Pos x={790} y={1520} s={0.95}>
					<Rexito {...ROSA} t={t} mx={mirar(790)} my={-1} boca />
				</Pos>
				<Pos x={580} y={1610} s={0.75}>
					<Tricerita {...LILA} t={t} mx={mirar(480)} my={-1} />
				</Pos>
			</Lienzo>
			<Texto desde={12} borde="#8f78d9">
				¡Un asteroide!
			</Texto>
		</AbsoluteFill>
	);
};

/* ========== Escena 3: ¡bum! suave y nubes que tapan el sol ========== */
const GOLPE = 30; // frame del "bum" dentro de la escena

export const Escena3: React.FC = () => {
	const t = useCurrentFrame();
	const {fps} = useVideoConfig();
	const caida = interpolate(t, [0, GOLPE], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
	const estallido = spring({frame: t - GOLPE, fps, config: {damping: 8, stiffness: 90}});
	const nubes = interpolate(t, [GOLPE, 200], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const oscuro = interpolate(t, [GOLPE, 200], [0, 1], clamp);
	const temblor = t > GOLPE && t < GOLPE + 12 ? Math.sin(t * 3) * 6 : 0;
	return (
		<AbsoluteFill>
			<Lienzo fondo="#cfe3f2">
				<Cielo id="c3" arriba="#a9dcff" abajo="#fde2f0" />
				<rect width={1080} height={1920} fill="#b8b2c9" opacity={oscuro * 0.75} />
				{/* el sol se va escondiendo y cierra los ojitos */}
				<Pos x={830} y={720 + nubes * 120} s={1 - nubes * 0.2}>
					<Sol t={t} cierre={nubes} />
				</Pos>
				{t < GOLPE && (
					<Pos x={600 + caida * 120} y={600 + caida * 700} s={0.8}>
						<Asteroide t={t} />
					</Pos>
				)}
				<g transform={`translate(${temblor} 0)`}>
					<Colinas c1="#c9e3d2" c2="#b3dbc1" c3="#a1d1b1" />
				</g>
				{/* nubes de polvo, redonditas y suaves */}
				{[
					[700, 1250, 1.2, 0],
					[420, 1180, 1.0, 0.3],
					[880, 1050, 1.1, 0.5],
					[220, 980, 1.0, 0.6],
					[600, 880, 1.3, 0.8],
					[900, 740, 1.2, 1.0],
					[300, 720, 1.1, 1.1],
				].map(([x, y, s, d], i) => {
					const k = interpolate(nubes, [d * 0.4, d * 0.4 + 0.45], [0, 1], clamp);
					return (
						<Pos key={i} x={x + Math.sin(t / 20 + i) * 15} y={y + (1 - k) * 300} s={s * k}>
							<Nube color={i % 2 ? '#d7d1e3' : '#c8c1d8'} />
						</Pos>
					);
				})}
				<Pos x={110} y={1420} s={1.05}>
					<Palmera t={t} />
				</Pos>
				<Pos x={1000} y={1440} s={0.9} flip>
					<Palmera t={t + 20} />
				</Pos>
				<Pos x={380} y={1500 + (t > GOLPE ? salto(t - GOLPE, 5, 30) * Math.max(0, 1 - (t - GOLPE) / 40) : 0)} s={1.15}>
					<Cuellilargo {...VERDE} t={t} my={-0.6} />
				</Pos>
				<Pos x={790} y={1520 + (t > GOLPE ? salto(t - GOLPE, 5, 50) * Math.max(0, 1 - (t - GOLPE) / 40) : 0)} s={0.95}>
					<Rexito {...ROSA} t={t} my={-0.6} boca />
				</Pos>
				<Pos x={580} y={1610} s={0.75}>
					<Tricerita {...LILA} t={t} my={-0.6} />
				</Pos>
				{/* globo de "¡BUM!" estilo cómic, en colores pastel */}
				{t >= GOLPE && (
					<Pos x={540} y={960} s={estallido} rot={-6} opacity={interpolate(t, [GOLPE + 70, GOLPE + 90], [1, 0], clamp)}>
						<polygon
							points={[...Array(24)]
								.map((_, i) => {
									const r = i % 2 ? 230 : 330;
									const a = (Math.PI / 12) * i;
									return `${Math.cos(a) * r},${Math.sin(a) * r * 0.8}`;
								})
								.join(' ')}
							fill="#fff1a8"
							stroke="#ffc6d9"
							strokeWidth={22}
							strokeLinejoin="round"
						/>
						<text
							textAnchor="middle"
							y={55}
							fontFamily="Fredoka, sans-serif"
							fontWeight={700}
							fontSize={190}
							fill="#ff8fb1"
							stroke="#ffffff"
							strokeWidth={22}
							paintOrder="stroke"
						>
							¡BUM!
						</text>
					</Pos>
				)}
			</Lienzo>
			<Texto desde={GOLPE + 95} borde="#9b8fb8" size={104}>
				El sol
				<br />
				se escondió
			</Texto>
		</AbsoluteFill>
	);
};

/* ========== Escena 4: frío, plantas marchitas, los dinos se duermen ========== */
export const Escena4: React.FC = () => {
	const t = useCurrentFrame();
	const marchito = interpolate(t, [0, 120], [0, 1], clamp);
	const sueno = interpolate(t, [70, 130], [0, 1], clamp);
	const acostado = interpolate(t, [90, 140], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
	const respirar = Math.sin(t / 14) * 0.015 * acostado;
	const desaparecer = interpolate(t, [175, 232], [1, 0], clamp);
	const nieve = interpolate(t, [0, 160], [0, 1], clamp);
	return (
		<AbsoluteFill>
			<Lienzo fondo="#dbe7f5">
				<Cielo id="c4" arriba="#c3d3ec" abajo="#eef1fb" />
				<Pos x={180} y={760} s={0.9} opacity={0.9}>
					<Nube color="#e6e3f0" />
				</Pos>
				<Pos x={820} y={700} s={1.1} opacity={0.9}>
					<Nube color="#dcd8ea" />
				</Pos>
				<Colinas c1="#d4e4dc" c2="#c9ddd2" c3="#bed6c8" />
				{/* manto de nieve que va creciendo */}
				<ellipse cx={540} cy={1650} rx={900} ry={120 + nieve * 60} fill="#ffffff" opacity={nieve * 0.9} />
				<ellipse cx={540} cy={1330} rx={700} ry={40} fill="#ffffff" opacity={nieve * 0.6} />
				<Pos x={110} y={1420} s={1.05}>
					<Palmera t={t} marchito={marchito} />
				</Pos>
				<Pos x={1000} y={1440} s={0.9} flip>
					<Palmera t={t + 20} marchito={marchito} />
				</Pos>
				<Pos x={250} y={1610} s={1.1}>
					<Helecho marchito={marchito} />
				</Pos>
				<Pos x={880} y={1640} s={1.2}>
					<Helecho color="#b9ecc4" marchito={marchito} />
				</Pos>
				{/* se recuestan despacito, cierran los ojos y se desvanecen como un sueño */}
				<g opacity={desaparecer}>
					<Pos x={380} y={1500 + acostado * 20} s={1.15 + respirar} rot={acostado * 4}>
						<Cuellilargo {...VERDE} t={t * (1 - acostado)} cierre={sueno} my={0.4} />
					</Pos>
					<Pos x={790} y={1520 + acostado * 30} s={0.95 + respirar} rot={-acostado * 8}>
						<Rexito {...ROSA} t={t * (1 - acostado)} cierre={sueno} />
					</Pos>
					<Pos x={580} y={1610 + acostado * 10} s={0.75 + respirar} rot={acostado * 5}>
						<Tricerita {...LILA} t={t * (1 - acostado)} cierre={sueno} />
					</Pos>
					{/* Zzz */}
					{[
						[250, 1180],
						[760, 1220],
						[480, 1530],
					].map(([x, y], i) =>
						[0, 1, 2].map((j) => {
							const k = ((t - 120 + j * 22 + i * 10) % 66) / 66;
							if (t < 120) return null;
							return (
								<text
									key={`${i}-${j}`}
									x={x + k * 60}
									y={y - k * 160}
									fontFamily="Fredoka, sans-serif"
									fontWeight={700}
									fontSize={44 + k * 30}
									fill="#9d8fd9"
									opacity={Math.sin(k * Math.PI)}
								>
									z
								</text>
							);
						}),
					)}
				</g>
				{/* estrellitas que suben cuando se van */}
				{t > 175 &&
					[...Array(14)].map((_, i) => {
						const k = interpolate(t, [175 + (i % 5) * 4, 238], [0, 1], clamp);
						return (
							<Pos key={i} x={300 + (i * 73) % 520} y={1500 - k * 600 - (i % 4) * 40} opacity={Math.sin(k * Math.PI)} rot={t * 3}>
								<Estrella r={14 + (i % 3) * 5} color={i % 2 ? '#fff6c9' : '#ffd1ec'} />
							</Pos>
						);
					})}
				{/* copos de nieve suaves */}
				{[...Array(26)].map((_, i) => (
					<Pos key={i} x={(i * 97 + Math.sin(t / 25 + i) * 40) % 1080} y={((t * (2 + (i % 3)) + i * 140) % 1300) + 600} opacity={0.9}>
						<Copo r={10 + (i % 4) * 4} />
					</Pos>
				))}
			</Lienzo>
			<Texto desde={10} borde="#8fa9d9">
				Hizo frío…
			</Texto>
		</AbsoluteFill>
	);
};

/* ========== Escena 5: ¡los pajaritos son dinosaurios! ========== */
export const Escena5: React.FC = () => {
	const t = useCurrentFrame();
	const {fps} = useVideoConfig();
	const amanece = interpolate(t, [0, 40], [0, 1], clamp);
	const llega = spring({frame: t - 12, fps, config: {damping: 12, stiffness: 70}});
	const flores = (i: number) => spring({frame: t - 20 - i * 6, fps, config: {damping: 9}});
	const px = interpolate(llega, [0, 1], [1250, 540]);
	const py = interpolate(llega, [0, 1], [800, 1420]) + (llega > 0.98 ? salto(t, 6, 45) : -Math.sin(llega * Math.PI) * 200);
	return (
		<AbsoluteFill>
			<Lienzo fondo="#fff4d6">
				<Cielo id="c5" arriba="#a9dcff" abajo="#fff0c9" />
				<Pos x={830} y={900 - amanece * 180} s={0.9 + amanece * 0.15}>
					<Sol t={t} />
				</Pos>
				<Pos x={200 + t * 0.4} y={760} s={0.75}>
					<Nube />
				</Pos>
				<Colinas c1="#c4ecd0" c2="#a9e2bb" c3="#95d8a8" />
				<Pos x={110} y={1420} s={1.05}>
					<Palmera t={t} />
				</Pos>
				<Pos x={1000} y={1440} s={0.9} flip>
					<Palmera t={t + 20} />
				</Pos>
				{[150, 300, 760, 900, 220, 840].map((x, i) => (
					<Pos key={i} x={x} y={i < 4 ? 1600 : 1720} s={flores(i) * 1.1}>
						<Flor color={['#ffb4c8', '#ffd1a8', '#c9a7ff', '#a8e0ff', '#ffe08a', '#ffb4c8'][i]} />
					</Pos>
				))}
				<Pos x={px} y={py} s={1.4} flip={llega < 0.98}>
					<Pajarito t={t} canta={t > 45 && Math.floor(t / 10) % 2 === 0} />
				</Pos>
				{/* un pajarito amigo en la palmera */}
				<Pos x={200} y={1010 + salto(t, 9, 15)} s={0.5} flip>
					<Pajarito t={t + 13} color="#ffc4d6" panza="#ffe9f0" />
				</Pos>
				{/* notas musicales del canto */}
				{t > 45 &&
					[0, 1, 2, 3].map((i) => {
						const k = ((t - 45 + i * 18) % 72) / 72;
						return (
							<Pos key={i} x={430 - k * 150 + Math.sin(k * 8) * 25} y={1250 - k * 300} rot={Math.sin(k * 6) * 15} opacity={Math.sin(k * Math.PI)} s={1.1}>
								<Nota color={['#c9a7ff', '#ffb4c8', '#8fd3ff', '#ffc24b'][i]} />
							</Pos>
						);
					})}
			</Lienzo>
			<Texto desde={60} size={96} borde="#f2a541">
				¡Los pajaritos
				<br />
				son dinosaurios!
			</Texto>
		</AbsoluteFill>
	);
};
