"use client";

import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, ShieldCheck, Send } from 'lucide-react';
import { ProductReview } from '../../types';
import { getProductReviews, submitProductReview } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';

interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Formular za novu recenziju
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadReviews() {
      setLoading(true);
      try {
        const data = await getProductReviews(productId);
        setReviews(data as ProductReview[]);
      } catch (err) {
        console.error('Greška pri dohvatanju recenzija:', err);
      } finally {
        setLoading(false);
      }
    }
    if (productId) {
      loadReviews();
    }
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!authorName.trim() || !comment.trim()) {
      setErrorMessage('Molimo unesite vaše ime i komentar.');
      return;
    }

    setSubmitting(true);

    try {
      const reviewPayload = {
        productId,
        author: authorName.trim(),
        userName: authorName.trim(),
        rating: Number(rating),
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      };

      const newId = await submitProductReview(reviewPayload);

      setReviews((prev) => [
        { ...reviewPayload, id: newId },
        ...prev,
      ]);

      setSuccessMessage(true);
      setAuthorName('');
      setComment('');
      setRating(5);
      setTimeout(() => setSuccessMessage(false), 5000);
    } catch (err: any) {
      setErrorMessage('Došlo je do greške prilikom slanja recenzije. Pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-8 font-['Inter']">
      
      {/* Zaglavlje sekcije */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-4">
        <div>
          <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] text-[#0A0A0A] bg-[#F7E97F] px-2 py-0.5">
            ISKUSTVA KUPACA
          </span>
          <h2 className="font-['Poppins'] text-xl sm:text-2xl font-black uppercase tracking-tight text-black mt-1">
            Recenzije i ocjene ({reviews.length})
          </h2>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-2 border-2 border-neutral-200 shadow-xs">
          <div className="flex text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= Math.round(Number(averageRating)) ? 'fill-amber-400' : 'text-neutral-300'}`}
              />
            ))}
          </div>
          <span className="font-['Poppins'] font-black text-sm text-black">{averageRating} / 5</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Forma za unos recenzije */}
        <div className="bg-white border-2 border-[#0A0A0A] p-6 space-y-4 shadow-md h-fit">
          <h3 className="font-['Poppins'] font-black text-sm uppercase text-black flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-black" />
            <span>Napišite recenziju</span>
          </h3>

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Hvala vam! Vaša recenzija je uspješno objavljena.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                Vaše ime ili nadimak *
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="npr. Haris K."
                className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                Vaša ocjena:
              </label>
              <div className="flex gap-1.5 pt-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${star <= rating ? 'fill-amber-400' : 'text-neutral-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-['Poppins'] font-bold uppercase mb-1">
                Vaš komentar i utisak o kvalitetu *
              </label>
              <textarea
                rows={4}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Kakav je pamuk, kroj i štampa? Kako vam odgovara veličina?"
                className="w-full bg-[#FAF9F5] border-2 border-neutral-300 p-2.5 focus:border-black focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#0A0A0A] text-white hover:bg-[#F7E97F] hover:text-[#0A0A0A] font-['Poppins'] text-xs font-black uppercase tracking-wider border-2 border-[#0A0A0A] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Objavljivanje...' : 'Objavi recenziju'}</span>
            </button>
          </form>
        </div>

        {/* Lista objavljenih recenzija */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <p className="text-xs text-neutral-500 py-6">Učitavanje recenzija kupaca...</p>
          ) : reviews.length === 0 ? (
            <div className="bg-white border-2 border-neutral-200 p-8 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-neutral-400 mx-auto" />
              <h4 className="font-['Poppins'] font-bold text-sm text-black">Budite prvi koji će ostaviti recenziju</h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Podijelite vaše iskustvo s materijalom i veličinom kako biste pomogli drugim kupcima.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => {
                const displayName = rev.author || rev.userName || 'Kupac';

                return (
                  <div key={rev.id} className="bg-white border-2 border-neutral-200 p-4 sm:p-5 space-y-2 shadow-xs">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-['Poppins'] font-bold text-xs text-black">
                          {displayName}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          Provjerena kupovina
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('bs-BA') : 'Nedavno'}
                      </span>
                    </div>

                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400' : 'text-neutral-200'}`}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed pt-1">
                      {rev.comment}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};