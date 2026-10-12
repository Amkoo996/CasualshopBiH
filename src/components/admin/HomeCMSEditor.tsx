import React, { useState, useEffect } from 'react';
import { Save, Layout, Video, CheckCircle2 } from 'lucide-react';
import { HomeCMSContent, DEFAULT_CMS_CONTENT } from '../../types';
import { getCMSContent, saveCMSContent } from '../../lib/db';

export const HomeCMSEditor: React.FC = () => {
  const [cms, setCms] = useState<HomeCMSContent>(DEFAULT_CMS_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCMSContent();
        setCms(data);
      } catch (e) {
        console.error('Greška pri učitavanju CMS koda:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveCMSContent(cms);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Greška pri spremanju sadržaja.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center font-mono text-xs">Učitavanje CMS-a...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl font-['Inter'] animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-['Poppins'] text-lg font-black uppercase tracking-wider text-black flex items-center gap-2">
            <Layout className="w-5 h-5 text-[#0A0A0A]" />
            <span>Uređivač Sadržaja Početne Stranice (CMS)</span>
          </h2>
          <p className="text-xs text-neutral-600 font-['Inter']">
            Sve izmjene koje ovdje napravite se odražavaju uživo na vašoj početnoj stranici.
          </p>
        </div>
      </div>

      {saved && (
        <div className="bg-[#F7E97F] border-2 border-black p-4 flex items-center gap-2 text-xs font-['Poppins'] font-bold text-black animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>Sadržaj početne stranice je uspješno sačuvan i ažuriran uživo!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. TOP BANER */}
        <div className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
          <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black border-b border-neutral-200 pb-2">
            1. Baner na vrhu stranice (Top Bar)
          </h3>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold font-['Poppins']">
              <input
                type="checkbox"
                checked={cms.topBar.enabled}
                onChange={(e) => setCms({ ...cms, topBar: { ...cms.topBar, enabled: e.target.checked } })}
                className="accent-black h-4 w-4 cursor-pointer"
              />
              <span>Prikaži Top Baner</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold font-['Poppins']">
              <input
                type="checkbox"
                checked={cms.topBar.showTimer}
                onChange={(e) => setCms({ ...cms, topBar: { ...cms.topBar, showTimer: e.target.checked } })}
                className="accent-black h-4 w-4 cursor-pointer"
              />
              <span>Prikaži Odbrojavanje (Timer)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Oznaka (Tag) *</label>
              <input
                type="text"
                value={cms.topBar.tagText}
                onChange={(e) => setCms({ ...cms, topBar: { ...cms.topBar, tagText: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Tekst promocije *</label>
              <input
                type="text"
                value={cms.topBar.promoText}
                onChange={(e) => setCms({ ...cms, topBar: { ...cms.topBar, promoText: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold focus:border-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. HERO SEKCIJA */}
        <div className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
          <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black border-b border-neutral-200 pb-2">
            2. Glavna Hero Sekcija
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Glavni Naslov (Linija 1) *</label>
              <input
                type="text"
                value={cms.hero.titleLine1}
                onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, titleLine1: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Žuti Naslov (Linija 2) *</label>
              <input
                type="text"
                value={cms.hero.titleLine2}
                onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, titleLine2: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Podnaslov *</label>
            <input
              type="text"
              value={cms.hero.subtitle}
              onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, subtitle: e.target.value } })}
              className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Opis brenda *</label>
            <textarea
              rows={3}
              value={cms.hero.description}
              onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, description: e.target.value } })}
              className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs focus:border-black focus:outline-none font-['Inter']"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Glavno Dugme (Tekst) *</label>
              <input
                type="text"
                value={cms.hero.ctaPrimaryText}
                onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, ctaPrimaryText: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">Sporedno Dugme (Tekst) *</label>
              <input
                type="text"
                value={cms.hero.ctaSecondaryText}
                onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, ctaSecondaryText: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1 flex items-center gap-1">
              <Video className="w-3.5 h-3.5" />
              <span>URL Pozadinskog Videa ili Slike *</span>
            </label>
            <input
              type="text"
              value={cms.hero.videoUrl}
              onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, videoUrl: e.target.value } })}
              placeholder="npr. /hero-video.mp4 ili Cloudinary URL"
              className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-mono focus:border-black focus:outline-none"
            />
          </div>
        </div>

        {/* 3. BENEFITI */}
        <div className="bg-white p-6 border-2 border-neutral-300 space-y-4 shadow-sm">
          <h3 className="font-['Poppins'] text-xs font-black uppercase tracking-wider text-black border-b border-neutral-200 pb-2">
            3. Sekcija sa Benefitima Kupovine
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase">1. Dostava (Naslov)</label>
              <input
                type="text"
                value={cms.benefits.shippingTitle}
                onChange={(e) => setCms({ ...cms, benefits: { ...cms.benefits, shippingTitle: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold"
              />
              <input
                type="text"
                value={cms.benefits.shippingSub}
                onChange={(e) => setCms({ ...cms, benefits: { ...cms.benefits, shippingSub: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-[11px]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase">2. Plaćanje (Naslov)</label>
              <input
                type="text"
                value={cms.benefits.paymentTitle}
                onChange={(e) => setCms({ ...cms, benefits: { ...cms.benefits, paymentTitle: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold"
              />
              <input
                type="text"
                value={cms.benefits.paymentSub}
                onChange={(e) => setCms({ ...cms, benefits: { ...cms.benefits, paymentSub: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-[11px]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase">3. Pregled (Naslov)</label>
              <input
                type="text"
                value={cms.benefits.inspectionTitle}
                onChange={(e) => setCms({ ...cms, benefits: { ...cms.benefits, inspectionTitle: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-xs font-bold"
              />
              <input
                type="text"
                value={cms.benefits.inspectionSub}
                onChange={(e) => setCms({ ...cms, benefits: { ...cms.benefits, inspectionSub: e.target.value } })}
                className="w-full bg-[#F4F2EC] border border-neutral-300 p-2 text-[11px]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider flex items-center gap-2 border-2 border-black transition-colors cursor-pointer shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Sačuvaj CMS Izmjene</span>
          </button>
        </div>
      </form>
    </div>
  );
};
