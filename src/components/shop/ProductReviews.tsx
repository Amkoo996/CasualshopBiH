import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, ShieldCheck, ThumbsUp, Send } from 'lucide-react';
import { ProductReview } from '../../types';
import { getProductReviews, submitProductReview } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Form inputs
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userName, setUserName] = useState<string>(user?.displayName || '');
  const [userEmail, setUserEmail] = useState<string>(user?.email || '');
  const [comment, setComment] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await getProductReviews(productId);
      setReviews(data);
    } catch (err) {
      console.warn('Could not load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  // Update user name and email when user logs in
  useEffect(() => {
    if (user?.displayName && !userName) {
      setUserName(user.displayName);
    }
    if (user?.email && !userEmail) {
      setUserEmail(user.email);
    }
  }, [user]);

  // Calculations
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 5.0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setErrorMsg('Molimo unesite vaše ime.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMsg('Recenzija mora sadržavati najmanje 5 karaktera.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const newReview: Omit<ProductReview, 'id'> = {
        productId,
        userName: userName.trim(),
        userEmail: userEmail.trim() || undefined,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        verifiedPurchase: true,
      };

      const docId = await submitProductReview(newReview);
      setReviews((prev) => [{ id: docId, ...newReview }, ...prev]);
      setComment('');
      setFormSuccess(true);
      setShowForm(false);
      setTimeout(() => setFormSuccess(false), 5000);
    } catch (err) {
      setErrorMsg('Došlo je do greške prilikom objave recenzije. Pokušajte ponovo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pt-8 border-t-2 border-neutral-300">
      {/* Title & Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-['Poppins'] font-black uppercase tracking-[0.2em] bg-[#0A0A0A] text-[#F7E97F] px-2 py-0.5">
              ISKUSTVA KUPACA
            </span>
            <span className="text-xs text-neutral-500 font-['Inter']">Ocjene & recenzije</span>
          </div>
          <h3 className="font-['Poppins'] text-xl sm:text-2xl font-black uppercase tracking-tight text-neutral-900 mt-1 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0A0A0A]" />
            <span>Recenzije za {productName}</span>
          </h3>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setErrorMsg(null);
          }}
          className="px-5 py-2.5 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white font-['Poppins'] text-xs font-black uppercase tracking-wider transition-colors border-2 border-[#0A0A0A] self-start sm:self-auto flex items-center gap-2 active:scale-95"
        >
          <Star className="w-4 h-4 fill-current" />
          <span>{showForm ? 'Zatvori obrazac' : 'Napiši recenziju'}</span>
        </button>
      </div>

      {/* Success banner */}
      {formSuccess && (
        <div className="bg-[#F7E97F] text-[#0A0A0A] border-2 border-[#0A0A0A] p-4 flex items-center gap-3 font-['Inter'] text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-[#0A0A0A] shrink-0" />
          <span>Hvala vam na recenziji! Vaša ocjena i utisak su uspješno zabilježeni u bazi.</span>
        </div>
      )}

      {/* Rating summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-neutral-200 p-5 flex flex-col items-center justify-center text-center space-y-2">
          <span className="font-['Poppins'] text-4xl sm:text-5xl font-black text-[#0A0A0A]">
            {totalReviews > 0 ? avgRating : '5.0'}
          </span>
          <div className="flex gap-1 text-[#F7E97F]">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= Math.round(avgRating)
                    ? 'fill-[#0A0A0A] text-[#0A0A0A]'
                    : 'text-neutral-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-500 font-['Inter']">
            Na osnovu <strong>{totalReviews}</strong> {totalReviews === 1 ? 'recenzije' : 'recenzija'}
          </span>
        </div>

        <div className="md:col-span-2 bg-white border-2 border-neutral-200 p-5 flex flex-col justify-center space-y-2 font-['Inter'] text-xs">
          <div className="flex items-center gap-2 text-neutral-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-neutral-900">100% provjerene recenzije kupaca</span>
          </div>
          <p className="text-neutral-600 leading-relaxed text-[11px]">
            Sve recenzije dolaze od stvarnih kupaca koji su naručili robu putem Casual Shop BiH. Cijenimo vaše mišljenje o udobnosti kroja, kvalitetu 240 GSM češljanog pamuka i postojanosti štampe.
          </p>
          <div className="flex items-center gap-3 text-[11px] text-neutral-500 pt-1">
            <span>👕 Veličina odgovara standardu</span>
            <span>•</span>
            <span>⚡ Brza dostava 2-5 dana</span>
          </div>
        </div>
      </div>

      {/* Form to submit review */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border-2 border-[#0A0A0A] p-6 space-y-5 animate-slideDown shadow-md"
        >
          <div className="border-b border-neutral-200 pb-3">
            <h4 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-black">
              Napišite svoju ocjenu za {productName}
            </h4>
            <p className="text-xs text-neutral-500 font-['Inter']">
              Podijelite svoje iskustvo sa veličinom, materijalom i cjelokupnim dojmom.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-800 border border-red-300 p-3 text-xs font-['Inter']">
              {errorMsg}
            </div>
          )}

          {/* Interactive Star Rating */}
          <div className="space-y-1.5">
            <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700">
              Vaša ocjena (1 do 5 zvjezdica) *
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = (hoverRating || rating) >= starValue;
                return (
                  <button
                    type="button"
                    key={starValue}
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    aria-label={`Ocjena ${starValue}`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isFilled
                          ? 'fill-[#0A0A0A] text-[#0A0A0A]'
                          : 'text-neutral-300'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="font-['Poppins'] text-xs font-bold text-neutral-800 ml-2">
                {rating === 5 ? '5/5 - Odlično' : rating === 4 ? '4/5 - Vrlo dobro' : rating === 3 ? '3/5 - Dobro' : rating === 2 ? '2/5 - Prosječno' : '1/5 - Slabo'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-['Inter']">
            <div>
              <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Vaše ime ili nadimak *
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="npr. Haris B. ili casual_fan"
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                E-mail adresa <span className="text-neutral-400 font-normal">(opciono, neće biti javno prikazana)</span>
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="npr. haris@gmail.com"
                className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-2.5 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Vaš komentar / recenzija *
            </label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Opišite kako vam stoji veličina, kakav je materijal pod rukom i kako se ponaša nakon pranja..."
              className="w-full bg-[#F4F2EC] border-2 border-neutral-300 p-3 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-black font-['Inter'] leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-xs font-['Poppins'] font-bold uppercase tracking-wider text-neutral-600 hover:text-black"
            >
              Odustani
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#0A0A0A] hover:bg-[#F7E97F] hover:text-[#0A0A0A] text-white font-['Poppins'] text-xs font-black uppercase tracking-wider flex items-center gap-2 border-2 border-[#0A0A0A] transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Spremanje...' : 'Objavi recenziju'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border-2 border-neutral-200 p-8 text-center text-xs text-neutral-500 font-['Inter']">
            Učitavam recenzije kupaca...
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-neutral-300 p-8 text-center space-y-3 font-['Inter']">
            <Star className="w-8 h-8 text-neutral-300 mx-auto" />
            <h4 className="font-['Poppins'] text-sm font-black uppercase tracking-wider text-neutral-800">
              Još nema recenzija za ovaj artikal
            </h4>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Budite prvi koji će ostaviti recenziju i pomoći ostalim članovima Casual zajednice u odabiru idealne veličine.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#0A0A0A] text-[#F7E97F] text-xs font-['Poppins'] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-neutral-800"
            >
              <span>Napiši prvu recenziju</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 font-['Inter']">
            {reviews.map((rev) => {
              const reviewDate = new Date(rev.createdAt).toLocaleDateString('bs-BA', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              return (
                <div
                  key={rev.id}
                  className="bg-white border-2 border-neutral-200 p-5 space-y-2.5 shadow-2xs hover:border-neutral-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#0A0A0A] text-[#F7E97F] font-['Poppins'] font-bold text-xs flex items-center justify-center shrink-0">
                        {rev.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-['Poppins'] font-bold text-xs text-neutral-900 block">
                          {rev.userName}
                        </span>
                        {rev.verifiedPurchase && (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Provjerena kupovina</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star
                            key={st}
                            className={`w-3.5 h-3.5 ${
                              st <= rev.rating
                                ? 'fill-[#0A0A0A] text-[#0A0A0A]'
                                : 'text-neutral-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {reviewDate}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed pt-1">
                    "{rev.comment}"
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
