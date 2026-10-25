// Muestra el texto dictado letra por letra, como una máquina de escribir.

export class Typewriter {
  constructor(el, { speed = 22 } = {}) {
    this.el = el;
    this.speed = speed;
    this.shown = '';
    this.target = '';
    this.timer = null;
    this.render();
  }

  setTarget(text) {
    this.target = text;
    // Si el reconocedor corrigió palabras, se "borra" hasta el prefijo común.
    let i = 0;
    while (i < this.shown.length && i < text.length && this.shown[i] === text[i]) i++;
    this.shown = this.shown.slice(0, i);
    if (!this.timer) this.timer = setInterval(() => this.step(), this.speed);
  }

  step() {
    if (this.shown.length >= this.target.length) {
      clearInterval(this.timer);
      this.timer = null;
      return;
    }
    // Acelera si va muy atrasado, para no perder el ritmo del dictado.
    const behind = this.target.length - this.shown.length;
    const n = behind > 40 ? 3 : 1;
    this.shown = this.target.slice(0, this.shown.length + n);
    this.render();
  }

  finish() {
    clearInterval(this.timer);
    this.timer = null;
    this.shown = this.target;
    this.render();
  }

  render() {
    this.el.textContent = this.shown;
    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.setAttribute('aria-hidden', 'true');
    this.el.appendChild(caret);
  }
}
