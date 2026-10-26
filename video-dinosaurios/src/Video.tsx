import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Escena1, Escena2, Escena3, Escena4, Escena5} from './escenas';
import narracion from './narracion.json';
import './fuente';

export const FPS = 30;
export const SEG_ESCENA = 8;
const ESCENAS = [Escena1, Escena2, Escena3, Escena4, Escena5];
const CRUCE = 12; // frames de fundido entre escenas

type Frase = {archivo: string; inicio: number; segundos: number};
const frases: Frase[] = narracion.escenas;

// La música va bajita y baja todavía más mientras habla la narradora.
const VOL_MUSICA = 0.14;
const VOL_MUSICA_VOZ = 0.07;

const Escena: React.FC<{i: number}> = ({i}) => {
	const frame = useCurrentFrame();
	const Comp = ESCENAS[i];
	const opacity = i === 0 ? 1 : interpolate(frame, [0, CRUCE], [0, 1], {extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{opacity}}>
			<Comp />
		</AbsoluteFill>
	);
};

export const AdiosDinosaurios: React.FC = () => {
	const {fps} = useVideoConfig();
	const volumenMusica = (f: number) => {
		const s = f / fps;
		const hablando = frases.some((x) => s > x.inicio - 0.3 && s < x.inicio + x.segundos + 0.3);
		return hablando ? VOL_MUSICA_VOZ : VOL_MUSICA;
	};
	return (
		<AbsoluteFill style={{backgroundColor: '#fde2f0'}}>
			{ESCENAS.map((_, i) => {
				const desde = i * SEG_ESCENA * fps;
				// cada escena dura sus 8 s y se queda un poquito más para el fundido con la siguiente
				const dura = SEG_ESCENA * fps + (i < ESCENAS.length - 1 ? CRUCE : 0);
				return (
					<Sequence key={i} from={desde} durationInFrames={dura} name={`Escena ${i + 1}`}>
						<Escena i={i} />
					</Sequence>
				);
			})}

			<Audio src={staticFile('audio/musica.wav')} volume={volumenMusica} />

			{frases.map((x, i) => (
				<Sequence key={x.archivo} from={Math.round(x.inicio * fps)} name={`Voz ${i + 1}`}>
					<Audio src={staticFile(x.archivo)} volume={1} />
				</Sequence>
			))}

			{/* efectos suaves */}
			<Sequence from={2 * SEG_ESCENA * fps + 30} durationInFrames={40} name="¡bum!">
				<Audio src={staticFile('audio/sfx-bum.wav')} volume={0.35} />
			</Sequence>
			<Sequence from={4 * SEG_ESCENA * fps + 32} durationInFrames={30} name="pío">
				<Audio src={staticFile('audio/sfx-pio.wav')} volume={0.12} />
			</Sequence>
		</AbsoluteFill>
	);
};
