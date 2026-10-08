import React, { useState, useEffect } from 'react';
import { StoreSettings, DEFAULT_STORE_SETTINGS } from '../../types';
import { getStoreSettings, saveStoreSettings } from '../../lib/db';
import { applyTheme } from '../../utils/theme';

export function DevSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // 1. Učitavanje postavki direktno iz Firebase baze
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getStoreSettings();
        setSettings(data);
        applyTheme(data);
      } catch (err) {
        console.error('Greška pri učitavanju postavki:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // 2. Ažuriranje lokalnog stanja i instant Live Preview na ekranu
  const handleChange = (field: keyof StoreSettings, value: any) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    applyTheme(updated);
  };

  // 3. Spremanje u Firebase Firestore bazu
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveStoreSettings(settings);
      applyTheme(settings);
      alert('Postavke teme su uspješno sačuvane u Firebase bazu za sve kupce!');
    } catch (err) {
      console.error('Greška pri spremanju:', err);
      alert('Došlo je do greške pri spremanju u bazu.');
    } finally {
      setSaving(false);
    }
  };

  // 4. Vraćanje na fabričke postavke
  const handleReset = async () => {
    if (window.confirm('Da li ste sigurni da želite vratiti sve vizuelne postavke na početne?')) {
      setSettings(DEFAULT_STORE_SETTINGS);
      applyTheme(DEFAULT_STORE_SETTINGS);
      try {
        await saveStoreSettings(DEFAULT_STORE_SETTINGS);
        alert('Postavke vraćene na fabričke!');
      } catch (err) {
        console.error('Greška pri resetovanju:', err);
      }
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Učitavanje postavki...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md my-8 text-black">
      <h2 className="text-2xl font-bold mb-6 border-b pb-2">Dev Settings — Stil i Tema Sajta</h2>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Pozadinska boja */}
        <div className="flex items-center justify-between">
          <label className="font-medium">Pozadinska boja (Background):</label>
          <input
            type="color"
            value={settings.bgColor || '#F4F2EC'}
            onChange={(e) => handleChange('bgColor', e.target.value)}
            className="w-12 h-10 border rounded cursor-pointer"
          />
        </div>

        {/* Boja teksta */}
        <div className="flex items-center justify-between">
          <label className="font-medium">Boja teksta (Text Color):</label>
          <input
            type="color"
            value={settings.textColor || '#111111'}
            onChange={(e) => handleChange('textColor', e.target.value)}
            className="w-12 h-10 border rounded cursor-pointer"
          />
        </div>

        {/* Yellow Brand Akcentna boja */}
        <div className="flex items-center justify-between">
          <label className="font-medium">Brend akcentna boja (Brand Accent):</label>
          <input
            type="color"
            value={settings.yellowBrand || '#F7E97F'}
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
            value={settings.bgImage || ''}
            onChange={(e) => handleChange('bgImage', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-black"
          />
        </div>

        {/* Font za Telo / Tekst */}
        <div>
          <label className="block font-medium mb-1">Font za tekst (Body Font):</label>
          <select
            value={settings.fontBody || "'Inter', sans-serif"}
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
            value={settings.fontHeading || "'Poppins', sans-serif"}
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
            Bazna veličina fonta: <span className="font-bold">{settings.fontSize || 16}px</span>
          </label>
          <input
            type="range"
            min="14"
            max="20"
            value={settings.fontSize || 16}
            onChange={(e) => handleChange('fontSize', Number(e.target.value))}
            className="w-full cursor-pointer accent-black"
          />
        </div>

        {/* Akcije */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50"
          >
            {saving ? 'Spremanje...' : 'Sačuvaj Promene'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
          >
            Vrati na Default
          </button>
        </div>
      </form>
    </div>
  );
}

export default DevSettings;
