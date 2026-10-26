import React from 'react';
import {Composition} from 'remotion';
import {AdiosDinosaurios, FPS, SEG_ESCENA} from './Video';

export const Root: React.FC = () => (
	<Composition
		id="AdiosDinosaurios"
		component={AdiosDinosaurios}
		durationInFrames={5 * SEG_ESCENA * FPS}
		fps={FPS}
		width={1080}
		height={1920}
	/>
);
