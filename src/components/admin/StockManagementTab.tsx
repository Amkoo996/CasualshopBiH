import React, { useState } from 'react';
import { 
  Package, 
  Upload, 
  Download, 
  Save, 
  Search, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Product, Size, CATEGORIES, Category } from '../../types';
import { saveProduct } from '../../lib/db';

interface StockManagementTabProps {
  products: Product[];
  onRefreshData: () => Promise<void>;
}

const SIZE_LIST: Size[] = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'One size'];

export const StockManagementTab: React.FC<StockManagementTabProps> = ({
  products,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Sve');
  const [stockChanges, setStockChanges] = useState<Record<string, Record<Size, number>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error: boolean } | null>(null);

  const handleStockChange = (productId: string, size: Size, value: number) => {
    const validVal = Math.max(0, value || 0);
    setStockChanges((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [size]: validVal,
      },
    }));
  };

  const handleSaveChanges = async () => {
    const updatedProductIds = Object.keys(stockChanges);
    if (updatedProductIds.length === 0) {
      setStatusMessage({ text: 'Nema izmjena za spremanje.', error: true });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      for (const prodId of updatedProductIds) {
        const prod = products.find((p) => p.id === prodId);
        if (prod) {
          const updatedSizes = {
            ...prod.sizes,
            ...stockChanges[prodId],
          };

          await saveProduct({
            ...prod,
            sizes: updatedSizes,
          });
        }
      }

      setStockChanges({});
      await onRefreshData();
      setStatusMessage({ text: 'Zalihe uspješno ažurirane u bazi!', error: false });
    } catch (err: any) {
      console.error('Greška pri spremanju zaliha:', err);
      setStatusMessage({ text: 'Greška prilikom spremanja zaliha.', error: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportStockCSV = () => {
    const headers = 'ID,Naziv,Kategorija,Cijena (KM),S,M,L,XL,XXL,3XL,One size,Ukupno Zaliha\n';
    const rows = products
      .map((p) => {
        const total = Object.values(p.sizes || {}).reduce((sum, v) => sum + (v || 0), 0);
        return `"${p.id}","${p.name}","${p.category}","${p.price.toFixed(2)}",${p.sizes?.S || 0},${p.sizes?.M || 0},${p.sizes?.L || 0},${p.sizes?.XL || 0},${p.sizes?.XXL || 0},${p.sizes?.['3XL'] || 0},${p.sizes?.['One size'] || 0},${total}`;
      })
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `casualshop_zalihe_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);

        if (lines.length <= 1) {
          setStatusMessage({ text: 'Datoteka je prazna ili neispravna.', error: true });
          setIsSaving(false);
          return;
        }

        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"\$/g, '').trim());
          if (cols.length >= 4) {
            const [id, name, category, priceStr, s, m, l, xl, xxl, xxxl, oneSize] = cols;

            if (name && priceStr) {
              const price = parseFloat(priceStr) || 0;
              const catValid = (CATEGORIES.includes(category as Category) ? category : 'Majice') as Category;

              const payload: Partial<Product> = {
                id: id && id.length > 3 ? id : undefined,
                name,
                category: catValid,
                price,
                color: 'Standardna',
                material: '100% češljani pamuk 240 GSM',
                description: '',
                sizes: {
                  S: parseInt(s) || 0,
                  M: parseInt(m) || 0,
                  L: parseInt(l) || 0,
                  XL: parseInt(xl) || 0,
                  XXL: parseInt(xxl) || 0,
                  '3XL': parseInt(xxxl) || 0,
                  'One size': parseInt(oneSize) || 0,
                },
                images: ['/images/sarajevo_geo_tee.jpg'],
                isNew: true,
                isHidden: false,
              };

              await saveProduct(payload as any);
              importedCount++;
            }
          }
        }

        await onRefreshData();
        setStatusMessage({ text: `Uspješno uvezeno/ažurirano ${importedCount} artikala iz Excel/CSV datoteke!`, error: false });
      } catch (err) {
        console.error('Greška pri parsiranju CSV-a:', err);
        setStatusMessage({ text: 'Greška pri čitanju datoteke. Provjerite format.', error: true });
      } finally {
        setIsSaving(false);
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'Sve' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const hasUnsavedChanges = Object.keys(stockChanges).length > 0;

  return (
    <div className="space-y-6 font-['Inter'] animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 border-2 border-neutral-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5 border border-[#F7E97F]">
              INVENTAR
            </span>
          </div>
          <h2 className="font-['Poppins'] text-lg sm:text-xl font-black uppercase tracking-tight text-neutral-900 mt-1 flex items-center gap-2">
            <Package className="w-5 h-5 text-black" />
            <span>Upravljanje Zalihama & Excel Import</span>
          </h2>
          <p className="text-xs text-neutral-500 font-['Inter']">
            Brza izmjena komada po veličinama, masovni unos putem Excel/CSV tabele i izvoz stanja magacina.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="px-3.5 py-2 bg-white border-2 border-neutral-300 hover:border-black text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 text-neutral-800 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Uvezi Excel/CSV</span>
            <input type="file" accept=".csv, .txt" onChange={handleFileUpload} className="hidden" disabled={isSaving} />
          </label>

          <button
            onClick={handleExportStockCSV}
            className="px-3.5 py-2 bg-white border-2 border-neutral-300 hover:border-black text-xs font-['Poppins'] font-bold uppercase tracking-wider flex items-center gap-2 text-neutral-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Izvezi zalihe</span>
          </button>

          <button
            onClick={handleSaveChanges}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-4 py-2 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Spremanje...' : `Spremi izmjene (${Object.keys(stockChanges).length})`}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-3 text-xs font-['Poppins'] font-bold border flex items-center gap-2 ${statusMessage.error ? 'bg-red-50 text-red-800 border-red-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'}`}>
          {statusMessage.error ? <AlertCircle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border-2 border-neutral-200">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Pretraži artikal po nazivu ili ID-u..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F4F2EC] border border-neutral-300 px-3 py-1.5 text-xs focus:bg-white focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-['Poppins'] font-bold uppercase text-neutral-500 shrink-0">Kategorija:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-['Poppins'] font-bold uppercase px-3 py-1 border border-neutral-300 bg-white focus:outline-none cursor-pointer"
          >
            <option value="Sve">Sve kategorije</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border-2 border-neutral-200 overflow-x-auto shadow-sm">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#0A0A0A] text-white font-['Poppins'] font-bold uppercase">
            <tr>
              <th className="p-3">Artikal</th>
              <th className="p-3">Cijena</th>
              {SIZE_LIST.map((sz) => (
                <th key={sz} className="p-3 text-center">{sz}</th>
              ))}
              <th className="p-3 text-center">Ukupno na stanju</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 font-['Inter']">
            {filteredProducts.map((p) => {
              const currentProdChanges = stockChanges[p.id] || {};
              const getTotalStock = () => {
                let sum = 0;
                SIZE_LIST.forEach((sz) => {
                  const val = currentProdChanges[sz] !== undefined ? currentProdChanges[sz] : (p.sizes?.[sz] ?? 0);
                  sum += val;
                });
                return sum;
              };

              const totalStock = getTotalStock();

              return (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images?.[0] || '/images/sarajevo_geo_tee.jpg'}
                        alt={p.name}
                        className="w-9 h-11 object-cover bg-neutral-100 border border-neutral-300 shrink-0"
                      />
                      <div>
                        <span className="font-['Poppins'] font-bold text-neutral-900 block">{p.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">{p.category} • ID: {p.id}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 font-['Poppins'] font-bold text-neutral-900 whitespace-nowrap">
                    {p.price.toFixed(2)} KM
                  </td>

                  {SIZE_LIST.map((sz) => {
                    const currentVal = currentProdChanges[sz] !== undefined ? currentProdChanges[sz] : (p.sizes?.[sz] ?? 0);
                    const isChanged = currentProdChanges[sz] !== undefined && currentProdChanges[sz] !== (p.sizes?.[sz] ?? 0);

                    return (
                      <td key={sz} className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={currentVal}
                          onChange={(e) => handleStockChange(p.id, sz, parseInt(e.target.value) || 0)}
                          className={`w-12 text-center py-1 border font-mono text-xs focus:outline-none ${
                            isChanged
                              ? 'border-black bg-[#F7E97F] font-bold text-black'
                              : currentVal > 0
                              ? 'border-neutral-300 bg-white text-black'
                              : 'border-neutral-200 bg-neutral-100 text-neutral-400'
                          }`}
                        />
                      </td>
                    );
                  })}

                  <td className="p-3 text-center font-['Poppins'] font-black text-sm">
                    <span className={totalStock > 0 ? 'text-black' : 'text-red-600 bg-red-50 px-2 py-0.5 border border-red-200 text-xs'}>
                      {totalStock > 0 ? `${totalStock} kom` : 'RASPRODANO'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
