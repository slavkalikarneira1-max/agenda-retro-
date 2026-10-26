import {continueRender, delayRender, staticFile} from 'remotion';

// Fuente redondita (Fredoka) servida localmente para que el render no dependa de internet.
const espera = delayRender('Cargando fuente Fredoka');
const fuente = new FontFace('Fredoka', `url(${staticFile('fonts/fredoka-latin-700-normal.woff2')}) format('woff2')`, {
	weight: '700',
});
fuente
	.load()
	.then(() => {
		document.fonts.add(fuente);
		continueRender(espera);
	})
	.catch((err) => {
		console.error(err);
		continueRender(espera);
	});
