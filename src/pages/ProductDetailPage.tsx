const handleInstagramOrder = () => {
    const sizeText = selectedSize ? selectedSize : 'Nije odabrano';
    const totalPrice = (product.price * quantity).toFixed(2);
    
    // Unaprijed pripremljen tekst sa svim detaljima
    const message = `Pozdrav! Želim naručiti artikal preko Instagrama:
----------------------------------
📦 Artikal: ${product.name}
📏 Veličina: ${sizeText}
🔢 Količina: ${quantity} kom
💰 Cijena: ${totalPrice} KM

Podaci za dostavu:
👤 Ime i Prezime: 
📞 Telefon: 
📍 Adresa i Grad: `;

    // Kopiranje teksta u clipboard korisnika
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message);
    } else {
      // Fallback za starije preglednike
      const textArea = document.createElement("textarea");
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setInstaCopied(true);
    setTimeout(() => setInstaCopied(false), 4000);

    // Otvaranje direktnog DM-a na Instagramu (ig.me/m/username otvara DM direktno u aplikaciji)
    const instagramUsername = settings?.instagramUrl 
      ? settings.instagramUrl.replace(/\/\$/, '').split('/').pop() 
      : 'casualshop.bih';
      
    // Direktan link za otvaranje DM chata
    const directDmUrl = `https://ig.me/m/${instagramUsername}`;

    setTimeout(() => {
      window.open(directDmUrl, '_blank');
    }, 400);
  };
