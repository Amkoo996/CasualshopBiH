import React, { useState, useEffect } from 'react';
import { applyTheme, DEFAULT_THEME } from '../../utils/theme';

export default function DevSettings() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    // Učitaj trenutno sačuvana podešavanja
    const saved = localStorage.getItem('site_theme');
    if (saved) {
      setTheme({ ...DEFAULT_THEME, ...JSON.parse(saved) });
    }
  }, []);

  const handleChange = (field, value) => {
    const updatedTheme = { ...theme, [field]: value };
    setTheme(updatedTheme);
    // Trenutno primenjuje promenu na ekranu (Live Preview)
    applyTheme(updatedTheme);
  };

  const handleSave = () => {
    // Čuvanje u LocalStorage (zameni sa fetch/axios pozivom prema svom backendu ako imaš bazni API)
    localStorage.setItem('site_theme', JSON.stringify(theme));
    alert('Podešavanja sajta su uspešno sačuvana!');
  };

  const handleReset = () => {
    setTheme(DEFAULT_THEME);
    applyTheme(DEFAULT_THEME);
    localStorage.removeItem('site_theme');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md my-8 text-black">
      <h2 className="text-2xl font-bold mb-6 border-b pb-2">Dev Settings — Stil i Tema Sajta</h2>

      <div className="space-y-5">
        {/* Pozadinska boja */}
        <div className="flex items-center justify-between">
          <label className="font-medium">Pozadinska boja (Background):</label>
          <input
            type="color"
            value={theme.bgColor}
            onChange={(e) => handleChange('bgColor', e.target.value)}
            className="w-12 h-10 border rounded cursor-pointer"
          />
        </div>

        {/* Boja teksta */}
        <div className="flex items-center justify-between">
          <label className="font-medium">Boja teksta (Text Color):</label>
          <input
            type="color"
            value={theme.textColor}
            onChange={(e) => handleChange('textColor', e.target.value)}
            className="w-12 h-10 border rounded cursor-pointer"
          />
        </div>

        {/* Yellow Brand Akcentna boja */}
        <div className="flex items-center justify-between">
          <label className="font-medium">Brend akcentna boja (Brand Accent):</label>
          <input
            type="color"
            value={theme.yellowBrand}
            onChange={(e) => handleChange('yellowBrand', e.target.value)}
            className="w-12 h-10 border rounded cursor-pointer"
          />
        </div>

        {/* Pozadinska slika URL */}
        <div>
          <label className="block font-medium mb-1">Pozadinska slika (URL):</label>
          <input
            type="text"
            placeholder="https://example.com/background.jpg"
            value={theme.bgImage}
            onChange={(e) => handleChange('bgImage', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-black"
          />
        </div>

        {/* Font za Telo / Tekst */}
        <div>
          <label className="block font-medium mb-1">Font za tekst (Body Font):</label>
          <select
            value={theme.fontBody}
            onChange={(e) => handleChange('fontBody', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="'Inter', sans-serif">Inter</option>
            <option value="'Roboto', sans-serif">Roboto</option>
            <option value="'Open Sans', sans-serif">Open Sans</option>
            <option value="Arial, sans-serif">Arial</option>
          </select>
        </div>

        {/* Font za Naslove */}
        <div>
          <label className="block font-medium mb-1">Font za naslove (Headings Font):</label>
          <select
            value={theme.fontHeading}
            onChange={(e) => handleChange('fontHeading', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="'Poppins', sans-serif">Poppins</option>
            <option value="'Montserrat', sans-serif">Montserrat</option>
            <option value="'Oswald', sans-serif">Oswald</option>
            <option value="'Playfair Display', serif">Playfair Display</option>
          </select>
        </div>

        {/* Veličina Fonta */}
        <div>
          <label className="block font-medium mb-1">
            Bazna veličina fonta: <span className="font-bold">{theme.fontSize}px</span>
          </label>
          <input
            type="range"
            min="14"
            max="20"
            value={theme.fontSize}
            onChange={(e) => handleChange('fontSize', Number(e.target.value))}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Akcije */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            onClick={handleSave}
            className="flex-1 bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors font-semibold"
          >
            Sačuvaj Promene
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
          >
            Vrati na Default
          </button>
        </div>
      </div>
    </div>
  );
}
