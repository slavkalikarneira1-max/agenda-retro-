import React from 'react';

/* Personajes y decorados dibujados en SVG.
   Todos se dibujan en su propio sistema de coordenadas y se colocan con <Pos>. */

export const Pos: React.FC<{
	x: number;
	y: number;
	s?: number;
	rot?: number;
	flip?: boolean;
	opacity?: number;
	children: React.ReactNode;
}> = ({x, y, s = 1, rot = 0, flip = false, opacity = 1, children}) => (
	<g
		transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`}
		opacity={opacity}
	>
		{children}
	</g>
);

/* ---------- Caritas ---------- */

// cierre: 0 = ojo abierto, 1 = dormido (rayita feliz)
export const Ojo: React.FC<{
	x: number;
	y: number;
	r?: number;
	mx?: number;
	my?: number;
	cierre?: number;
}> = ({x, y, r = 16, mx = 0, my = 0, cierre = 0}) => {
	if (cierre >= 0.85) {
		return (
			<path
				d={`M${x - r} ${y} Q${x} ${y + r * 0.9} ${x + r} ${y}`}
				stroke="#4a3b52"
				strokeWidth={r * 0.35}
				fill="none"
				strokeLinecap="round"
			/>
		);
	}
	const ry = r * (1 - cierre);
	return (
		<g>
			<ellipse cx={x} cy={y} rx={r} ry={ry} fill="#fff" />
			<ellipse cx={x + mx * r * 0.35} cy={y + my * r * 0.35} rx={r * 0.62} ry={ry * 0.62} fill="#3b2e45" />
			<circle cx={x + mx * r * 0.35 - r * 0.22} cy={y + my * r * 0.35 - ry * 0.25} r={r * 0.22} fill="#fff" />
		</g>
	);
};

export const Sonrisa: React.FC<{x: number; y: number; w?: number; abierta?: boolean}> = ({
	x,
	y,
	w = 30,
	abierta = false,
}) =>
	abierta ? (
		<path
			d={`M${x - w / 2} ${y} Q${x} ${y + w * 0.9} ${x + w / 2} ${y} Z`}
			fill="#e8768f"
			stroke="#4a3b52"
			strokeWidth={4}
			strokeLinejoin="round"
		/>
	) : (
		<path
			d={`M${x - w / 2} ${y} Q${x} ${y + w * 0.6} ${x + w / 2} ${y}`}
			stroke="#4a3b52"
			strokeWidth={5}
			fill="none"
			strokeLinecap="round"
		/>
	);

export const Cachete: React.FC<{x: number; y: number; r?: number}> = ({x, y, r = 12}) => (
	<ellipse cx={x} cy={y} rx={r} ry={r * 0.65} fill="#ff9fb8" opacity={0.75} />
);

type DinoProps = {
	color: string;
	panza: string;
	manchas?: string;
	cierre?: number; // ojos cerrándose (dormir)
	mx?: number; // hacia dónde mira
	my?: number;
	t?: number; // frame para pequeñas animaciones
	boca?: boolean; // boca abierta (contento / bostezo)
};

/* ---------- Dino de cuello largo (Cuellilargo) ---------- */
// Ocupa aprox. de (-210,-260) a (210,120); origen en el suelo, al centro.
export const Cuellilargo: React.FC<DinoProps> = ({color, panza, manchas = '#fff', cierre = 0, mx = 0, my = 0, t = 0, boca}) => {
	const cola = Math.sin(t / 9) * 6;
	const cuello = Math.sin(t / 14) * 4;
	return (
		<g>
			{/* cola */}
			<path
				d={`M90 -40 Q190 -40 ${215 + cola} ${-90 + cola}`}
				stroke={color}
				strokeWidth={34}
				strokeLinecap="round"
				fill="none"
			/>
			{/* patas traseras */}
			<rect x={-120} y={-40} width={44} height={80} rx={20} fill={color} />
			<rect x={55} y={-40} width={44} height={80} rx={20} fill={color} />
			{/* cuerpo */}
			<ellipse cx={0} cy={-60} rx={140} ry={80} fill={color} />
			<ellipse cx={-5} cy={-30} rx={100} ry={42} fill={panza} />
			<circle cx={20} cy={-105} r={14} fill={manchas} opacity={0.55} />
			<circle cx={60} cy={-85} r={10} fill={manchas} opacity={0.55} />
			<circle cx={-20} cy={-118} r={9} fill={manchas} opacity={0.55} />
			{/* patas delanteras */}
			<rect x={-85} y={-30} width={44} height={70} rx={20} fill={color} />
			<rect x={20} y={-30} width={44} height={70} rx={20} fill={color} />
			{/* cuello y cabeza */}
			<g transform={`rotate(${cuello} -90 -80)`}>
				<path d="M-80 -90 Q-160 -150 -150 -240" stroke={color} strokeWidth={56} strokeLinecap="round" fill="none" />
				<ellipse cx={-160} cy={-262} rx={62} ry={46} fill={color} />
				<Ojo x={-170} y={-275} r={15} mx={mx} my={my} cierre={cierre} />
				<Ojo x={-128} y={-275} r={13} mx={mx} my={my} cierre={cierre} />
				<Cachete x={-190} y={-245} r={12} />
				<Cachete x={-110} y={-245} r={10} />
				<Sonrisa x={-150} y={-242} w={34} abierta={boca} />
			</g>
		</g>
	);
};

/* ---------- Mini T-rex tierno (Rexito) ---------- */
// Origen en el suelo, al centro. Alto aprox. 330.
export const Rexito: React.FC<DinoProps> = ({color, panza, manchas = '#fff', cierre = 0, mx = 0, my = 0, t = 0, boca}) => {
	const brazo = Math.sin(t / 5) * 12;
	return (
		<g>
			{/* púas */}
			{[-150, -200, -250].map((yy, i) => (
				<path key={i} d={`M${70 - i * 12} ${yy} l34 -6 l-14 30 z`} fill={manchas} strokeLinejoin="round" stroke={manchas} strokeWidth={8} />
			))}
			{/* cola */}
			<path d="M40 -60 Q130 -50 150 -10" stroke={color} strokeWidth={40} strokeLinecap="round" fill="none" />
			{/* piernas */}
			<ellipse cx={-40} cy={-15} rx={30} ry={28} fill={color} />
			<ellipse cx={40} cy={-15} rx={30} ry={28} fill={color} />
			{/* cuerpo */}
			<ellipse cx={0} cy={-90} rx={85} ry={90} fill={color} />
			<ellipse cx={-5} cy={-75} rx={55} ry={62} fill={panza} />
			{/* bracitos */}
			<g transform={`rotate(${brazo} -55 -120)`}>
				<rect x={-90} y={-128} width={40} height={18} rx={9} fill={color} />
			</g>
			<g transform={`rotate(${-brazo} 45 -120)`}>
				<rect x={40} y={-128} width={40} height={18} rx={9} fill={color} />
			</g>
			{/* cabeza */}
			<ellipse cx={-5} cy={-235} rx={88} ry={72} fill={color} />
			<Ojo x={-38} y={-250} r={18} mx={mx} my={my} cierre={cierre} />
			<Ojo x={28} y={-250} r={18} mx={mx} my={my} cierre={cierre} />
			<Cachete x={-62} y={-212} r={14} />
			<Cachete x={52} y={-212} r={14} />
			<Sonrisa x={-5} y={-210} w={46} abierta={boca} />
		</g>
	);
};

/* ---------- Triceratops (Tricerita) ---------- */
// Mira hacia la izquierda. Origen en el suelo.
export const Tricerita: React.FC<DinoProps> = ({color, panza, manchas = '#ffe6a7', cierre = 0, mx = 0, my = 0, t = 0, boca}) => {
	const cola = Math.sin(t / 7) * 8;
	return (
		<g>
			<path d={`M100 -50 Q160 -45 ${175 + cola} ${-15}`} stroke={color} strokeWidth={26} strokeLinecap="round" fill="none" />
			<rect x={-80} y={-40} width={38} height={60} rx={17} fill={color} />
			<rect x={55} y={-40} width={38} height={60} rx={17} fill={color} />
			<ellipse cx={20} cy={-70} rx={110} ry={68} fill={color} />
			<ellipse cx={15} cy={-45} rx={78} ry={30} fill={panza} />
			<rect x={-40} y={-35} width={38} height={55} rx={17} fill={color} />
			<rect x={30} y={-35} width={38} height={55} rx={17} fill={color} />
			{/* gorguera */}
			<circle cx={-95} cy={-120} r={78} fill={manchas} />
			<circle cx={-95} cy={-120} r={62} fill={color} opacity={0.5} />
			{/* cabeza */}
			<ellipse cx={-120} cy={-95} rx={66} ry={56} fill={color} />
			{/* cuernitos redondeados */}
			<path d="M-150 -140 q-6 -40 6 -50 q8 14 10 46 z" fill="#fff6e0" stroke="#fff6e0" strokeWidth={8} strokeLinejoin="round" />
			<path d="M-100 -145 q-2 -42 12 -50 q6 16 4 48 z" fill="#fff6e0" stroke="#fff6e0" strokeWidth={8} strokeLinejoin="round" />
			<path d="M-182 -95 q-16 -16 -10 -30 q12 6 20 24 z" fill="#fff6e0" stroke="#fff6e0" strokeWidth={6} strokeLinejoin="round" />
			<Ojo x={-145} y={-105} r={14} mx={mx} my={my} cierre={cierre} />
			<Ojo x={-108} y={-105} r={13} mx={mx} my={my} cierre={cierre} />
			<Cachete x={-165} y={-78} r={11} />
			<Cachete x={-90} y={-78} r={11} />
			<Sonrisa x={-128} y={-75} w={32} abierta={boca} />
		</g>
	);
};

/* ---------- Pajarito ---------- */
// Origen en las patitas. Alto aprox. 260.
export const Pajarito: React.FC<{t: number; color?: string; panza?: string; canta?: boolean}> = ({
	t,
	color = '#ffd76b',
	panza = '#fff3c4',
	canta = false,
}) => {
	const ala = Math.sin(t / 2.2) * 28;
	return (
		<g>
			{/* patitas */}
			<path d="M-22 -30 v30 M22 -30 v30 M-34 0 h24 M10 0 h24" stroke="#f29a5a" strokeWidth={8} strokeLinecap="round" />
			{/* colita */}
			<path d="M80 -110 l60 -30 l-12 40 l30 0 z" fill="#ffb4c8" stroke="#ffb4c8" strokeWidth={10} strokeLinejoin="round" />
			{/* cuerpo */}
			<circle cx={0} cy={-125} r={105} fill={color} />
			<ellipse cx={-10} cy={-90} rx={70} ry={58} fill={panza} />
			{/* penachito */}
			<path d="M-10 -228 q-10 -40 15 -50 q-2 25 12 45 z" fill="#ffb4c8" />
			<path d="M10 -226 q15 -35 40 -32 q-15 18 -14 36 z" fill="#ffb4c8" />
			{/* ala */}
			<g transform={`rotate(${-ala} 50 -130)`}>
				<ellipse cx={75} cy={-120} rx={55} ry={34} fill="#ffc24b" />
			</g>
			{/* carita */}
			<Ojo x={-50} y={-160} r={17} />
			<Ojo x={5} y={-160} r={17} />
			<Cachete x={-78} y={-125} r={15} />
			<Cachete x={30} y={-125} r={15} />
			{canta ? (
				<g>
					<path d="M-38 -138 l-34 12 l34 4 z" fill="#f59a3b" stroke="#f59a3b" strokeWidth={6} strokeLinejoin="round" />
					<path d="M-38 -128 l-26 14 l26 -2 z" fill="#e47d2a" stroke="#e47d2a" strokeWidth={6} strokeLinejoin="round" />
				</g>
			) : (
				<path d="M-38 -140 l-34 12 l34 12 z" fill="#f59a3b" stroke="#f59a3b" strokeWidth={6} strokeLinejoin="round" />
			)}
		</g>
	);
};

/* ---------- Decorados ---------- */

export const Sol: React.FC<{t: number; r?: number; cierre?: number; color?: string}> = ({t, r = 110, cierre = 0, color = '#ffe08a'}) => (
	<g>
		<g transform={`rotate(${t * 0.6})`}>
			{Array.from({length: 12}).map((_, i) => (
				<rect
					key={i}
					x={-12}
					y={-r - 55}
					width={24}
					height={42}
					rx={12}
					fill={color}
					opacity={0.85}
					transform={`rotate(${i * 30})`}
				/>
			))}
		</g>
		<circle r={r} fill={color} />
		<circle r={r * 0.8} fill="#fff1b8" opacity={0.6} />
		<Ojo x={-r * 0.32} y={-r * 0.12} r={r * 0.12} cierre={cierre} />
		<Ojo x={r * 0.32} y={-r * 0.12} r={r * 0.12} cierre={cierre} />
		<Cachete x={-r * 0.55} y={r * 0.2} r={r * 0.13} />
		<Cachete x={r * 0.55} y={r * 0.2} r={r * 0.13} />
		<Sonrisa x={0} y={r * 0.18} w={r * 0.45} />
	</g>
);

export const Nube: React.FC<{color?: string; s?: number}> = ({color = '#fff', s = 1}) => (
	<g transform={`scale(${s})`}>
		<ellipse cx={0} cy={0} rx={130} ry={60} fill={color} />
		<circle cx={-60} cy={-25} r={55} fill={color} />
		<circle cx={30} cy={-50} r={70} fill={color} />
		<circle cx={90} cy={-10} r={45} fill={color} />
	</g>
);

// marchito: 0 = verde y alegre, 1 = seco y caído
const mezcla = (a: string, b: string, k: number) => {
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
};

export const Palmera: React.FC<{t: number; marchito?: number; h?: number}> = ({t, marchito = 0, h = 420}) => {
	const verde = mezcla('#8fd6a0', '#d8c7a0', marchito);
	const verde2 = mezcla('#6cc387', '#c9b48c', marchito);
	const vaiven = Math.sin(t / 20) * 3 * (1 - marchito);
	return (
		<g transform={`rotate(${vaiven})`}>
			<path d={`M0 0 Q 25 ${-h / 2} 0 ${-h}`} stroke="#d9a982" strokeWidth={34} fill="none" strokeLinecap="round" />
			{[0.2, 0.4, 0.6, 0.8].map((k) => (
				<path key={k} d={`M-14 ${-h * k} q16 8 30 0`} stroke="#c4906b" strokeWidth={6} fill="none" strokeLinecap="round" />
			))}
			{[-70, -30, 10, 50, 90, 130, 170].map((a, i) => (
				<ellipse
					key={i}
					cx={0}
					cy={-75}
					rx={36}
					ry={95}
					fill={i % 2 ? verde : verde2}
					transform={`translate(0 ${-h}) rotate(${a - 50 + (a > 50 ? 1 : -1) * marchito * 25}) `}
				/>
			))}
			<circle cx={-14} cy={-h + 14} r={16} fill="#c99566" />
			<circle cx={14} cy={-h + 18} r={16} fill="#c99566" />
		</g>
	);
};

export const Helecho: React.FC<{marchito?: number; color?: string}> = ({marchito = 0, color = '#a7e3b2'}) => {
	const c = mezcla(color, '#d9caa6', marchito);
	return (
		<g>
			{[-50, -25, 0, 25, 50].map((a, i) => (
				<ellipse
					key={i}
					cx={0}
					cy={-70}
					rx={24}
					ry={75}
					fill={c}
					transform={`rotate(${a * (1 + marchito * 1.6)})`}
				/>
			))}
		</g>
	);
};

export const Flor: React.FC<{color?: string; s?: number; marchito?: number}> = ({color = '#ffb4c8', s = 1, marchito = 0}) => (
	<g transform={`scale(${s}) rotate(${marchito * 35} 0 0)`}>
		<path d="M0 0 v-70" stroke={mezcla('#7ccf8f', '#cdb98f', marchito)} strokeWidth={8} strokeLinecap="round" />
		<g transform="translate(0 -80)">
			{[0, 72, 144, 216, 288].map((a) => (
				<ellipse key={a} cx={0} cy={-18} rx={13} ry={20} fill={mezcla(color.length === 7 ? color : '#ffb4c8', '#d9c9b0', marchito)} transform={`rotate(${a})`} />
			))}
			<circle r={12} fill="#ffe08a" />
		</g>
	</g>
);

export const Estrella: React.FC<{r?: number; color?: string}> = ({r = 14, color = '#fff6c9'}) => {
	const pts = Array.from({length: 10})
		.map((_, i) => {
			const rr = i % 2 ? r * 0.45 : r;
			const a = (Math.PI / 5) * i - Math.PI / 2;
			return `${Math.cos(a) * rr},${Math.sin(a) * rr}`;
		})
		.join(' ');
	return <polygon points={pts} fill={color} strokeLinejoin="round" stroke={color} strokeWidth={r * 0.25} />;
};

export const Copo: React.FC<{r?: number}> = ({r = 16}) => (
	<g stroke="#ffffff" strokeWidth={r * 0.28} strokeLinecap="round">
		{[0, 60, 120].map((a) => (
			<line key={a} x1={-r} y1={0} x2={r} y2={0} transform={`rotate(${a})`} />
		))}
		<circle r={r * 0.3} fill="#fff" />
	</g>
);

export const Nota: React.FC<{color?: string}> = ({color = '#c9a7ff'}) => (
	<g>
		<ellipse cx={0} cy={0} rx={18} ry={13} fill={color} transform="rotate(-20)" />
		<path d="M15 -4 V-60 q18 8 22 26" stroke={color} strokeWidth={7} fill="none" strokeLinecap="round" />
	</g>
);
