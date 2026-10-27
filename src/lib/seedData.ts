import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'cs-tee-sarajevo-geo-01',
    name: 'Majica "SARAJEVO geographic" Box Logo',
    price: 35.0,
    originalPrice: 45.0,
    category: 'Majice',
    color: 'Crna sa bijelim box printom',
    material: '100% ceSljani pamuk 240 GSM',
    careInstructions: 'Prati u maSini na 30°C izvrnuto. Peglati s unutraSnje strane. Ne suSiti u suSilici.',
    description: 'Prepoznatljiva ulicna majica s kultnim "SARAJEVO geographic" box logom na prsima. Boxy ulicni kroj sa spuStenim ramenima i ojacanim rebrastim ovratnikom.',
    details: [
      '100% vrhunski ceSljani pamuk 240 GSM',
      'Boxy streetwear kroj (regular/relaxed fit)',
      'Visokokvalitetni sitotisak postojan na pranje',
      'UnutraSnja zuta traka na ovratniku'
    ],
    images: [
      '/images/sarajevo_geo_tee.jpg',
      '/images/sarajevo_green_tee.jpg'
    ],
    sizes: {
      S: 5,
      M: 8,
      L: 6,
      XL: 3,
    },
    isNew: true,
    featured: true,
    isHidden: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cs-tee-away-days-02',
    name: 'Majica "BEST DAYS ? AWAY DAYS" Ultras Van',
    price: 40.0,
    category: 'Majice',
    color: 'Crna',
    material: '100% ceSljani pamuk 240 GSM',
    careInstructions: 'Prati na 30°C izvrnuto, ne izbjeljivati, peglati na srednjoj temperaturi.',
    description: 'Streetwear majica posvecena kulturi putovanja, kombija i navijackih gostovanja uz ilustraciju VW Transportera i natpis "Best days? Away days".',
    details: [
      'Gusti ceSljani pamuk 240 GSM',
      'Detaljna viSebojna grafika na prsima',
      'Mekana tkanina prijatna za cjelodnevno noSenje'
    ],
    images: [
      '/images/away_days_tee.jpg'
    ],
    sizes: {
      S: 4,
      M: 7,
      L: 5,
      XL: 2,
    },
    isNew: true,
    featured: true,
    isHidden: false,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cs-tee-sarajevo-green-03',
    name: 'Majica "SARAJEVO geographic" Sage Green Box',
    price: 35.0,
    category: 'Majice',
    color: 'Crna sa sage zelenim printom',
    material: '100% pamuk 240 GSM',
    careInstructions: 'Prati na 30°C naopako.',
    description: 'Limitirano izdanje kultne Sarajevo geographic majice sa podlogom u zagasitoj maslinasto/kadulja zelenoj nijansi.',
    details: [
      'Specijalna sage green nijansa printa',
      '100% organski ceSljani pamuk',
      'Boxy streetwear kroj'
    ],
    images: [
      '/images/sarajevo_green_tee.jpg',
      '/images/sarajevo_geo_tee.jpg'
    ],
    sizes: {
      S: 3,
      M: 6,
      L: 5,
      XL: 2,
    },
    isNew: true,
    featured: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cs-tee-copacabana-04',
    name: 'Majica "COPACABANA" Casual Retro Font',
    price: 35.0,
    originalPrice: 40.0,
    category: 'Majice',
    color: 'Crna sa bijelim slovima i zutom trakom',
    material: '100% ceSljani pamuk 240 GSM',
    careInstructions: 'Prati na 30°C.',
    description: 'Minimalisticka crna streetwear majica sa lucnim retro natpisom COPACABANA u reljefnom printu i kontrastnom zutom trakom u kragni.',
    details: [
      'Retro lucni lettering',
      'zuta unutraSnja ojacana traka ovratnika',
      'OpuSteni kroj'
    ],
    images: [
      '/images/copacabana_tee.jpg'
    ],
    sizes: {
      S: 4,
      M: 6,
      L: 5,
      XL: 3,
    },
    isNew: true,
    featured: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cs-tee-standing-not-running-05',
    name: 'Majica "MADE FOR STANDING NOT RUNNING" Sneakers',
    price: 40.0,
    category: 'Majice',
    color: 'Crna',
    material: '100% ceSljani pamuk 240 GSM',
    careInstructions: 'Prati na 30°C, suSiti na zraku.',
    description: 'Klasik ulicne casual kulture: retro patike uz natpis "Made for standing not running". SavrSen izbor za tribinu, ulicu i svakodnevne casual kombinacije.',
    details: [
      'Premijum pamuk sa silikonskom obradom',
      'Autenticna retro tenisice grafika',
      'Udoban kroj sa slobodnim padom'
    ],
    images: [
      '/images/standing_tee.jpg'
    ],
    sizes: {
      S: 4,
      M: 9,
      L: 7,
      XL: 4,
    },
    isNew: false,
    featured: true,
    isHidden: false,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cs-tee-no-pyro-06',
    name: 'Majica "NO PYRO NO PARTY" Olive Flare',
    price: 38.0,
    originalPrice: 45.0,
    category: 'Majice',
    color: 'Maslinasto zelena (Olive)',
    material: '100% ceSljani pamuk 240 GSM',
    careInstructions: 'Prati na 30°C naopako.',
    description: 'Maslinasta majica s prepoznatljivim plamenom baklje i natpisom "No Pyro No Party". Upecatljiv kontrast boja i Casual bocni amblem na rukavu.',
    details: [
      'Zagasito maslinasto-zelena nijansa',
      'Visokootporan sitotisak u bijeloj i narandzastoj boji',
      'Casual tkani mini amblem na rukavu'
    ],
    images: [
      '/images/pyro_party_tee.jpg'
    ],
    sizes: {
      S: 3,
      M: 5,
      L: 4,
      XL: 2,
    },
    isNew: false,
    featured: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cs-hoodie-boxy-classic-07',
    name: 'CS Boxy Hoodie "Casual Svaki Dan" Heavyweight',
    price: 80.0,
    originalPrice: 95.0,
    category: 'Duksevi i hoodice',
    color: 'Crna',
    material: '100% ceSljani pamuk 460 GSM s flisom',
    careInstructions: 'Prati na 30°C, ne koristiti suSilicu.',
    description: 'Najtrazeniji komad brenda: teSki 460 GSM duks sa Sirokom kapuljacom bez pertli i minimalistickim vezenim detaljima.',
    details: [
      '460 GSM gusti organski pamuk',
      'Dupla kapuljaca za cvrst volumen',
      'Prednji kengur dzep'
    ],
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=80'
    ],
    sizes: {
      S: 2,
      M: 5,
      L: 4,
      XL: 2,
    },
    isNew: false,
    featured: true,
    isHidden: false,
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cs-bucket-hat-signature-08',
    name: 'CS Signature Bucket SeSir "Casual Black"',
    price: 25.0,
    category: 'Kape i šeširi',
    color: 'Crna sa zutim detaljem',
    material: '100% cvrsti pamucni keper',
    careInstructions: 'Rucno pranje u mlakoj vodi.',
    description: 'Prepoznatljivi bucket SeSir sa logotipom brenda. Pruza klasican casual streetwear izgled i zaStitu.',
    details: [
      'Univerzalna velicina (One size fits all)',
      'cvrst obod sa proStepanim linijama'
    ],
    images: [
      'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=1000&q=80'
    ],
    sizes: {
      'One size': 14,
    },
    isNew: false,
    featured: false,
    isHidden: false,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  }
];
