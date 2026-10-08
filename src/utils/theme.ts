export const DEFAULT_THEME = {
  bgColor: '#F4F2EC',
  textColor: '#111111',
  yellowBrand: '#F7E97F',
  scrollThumb: '#0A0A0A',
  fontBody: "'Inter', sans-serif",
  fontHeading: "'Poppins', sans-serif",
  fontSize: 16,
  bgImage: ''
};

export const applyTheme = (theme = {}) => {
  const root = document.documentElement;
  const t = { ...DEFAULT_THEME, ...theme };

  root.style.setProperty('--bg-color', t.bgColor);
  root.style.setProperty('--text-color', t.textColor);
  root.style.setProperty('--yellow-brand', t.yellowBrand);
  root.style.setProperty('--scroll-track', t.bgColor);
  root.style.setProperty('--scroll-thumb', t.scrollThumb);
  
  root.style.setProperty('--font-body', t.fontBody);
  root.style.setProperty('--font-heading', t.fontHeading);
  root.style.setProperty('--base-font-size', `${t.fontSize}px`);

  if (t.bgImage && t.bgImage.trim() !== '') {
    root.style.setProperty('--bg-image', `url("${t.bgImage}")`);
  } else {
    root.style.setProperty('--bg-image', 'none');
  }
};
