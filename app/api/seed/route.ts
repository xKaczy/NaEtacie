/**
 * Seed API route - adds sample construction announcements to Firestore.
 * GET /api/seed - populates database with 20 real-looking construction ads from Szczecin.
 */

import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const ANNOUNCEMENTS = [
  { title: 'Kompleksowe remonty mieszkań i domów - Szczecin', description: 'Pełen zakres usług remontowo-budowlanych: malowanie, gładzie, płytki, podłogi, instalacje. Doświadczenie 15 lat.', source_portal: 'olx', category: 'budowa-remont', location_text: 'Szczecin, Centrum', latitude: 53.4285, longitude: 14.5528, price: 80 },
  { title: 'Usługi hydrauliczne - instalacje wod-kan, CO', description: 'Montaż i wymiana instalacji wodnych, kanalizacyjnych, centralnego ogrzewania. Awarie 24h.', source_portal: 'olx', category: 'instalacje', location_text: 'Szczecin, Pogodno', latitude: 53.4335, longitude: 14.5183, price: 120 },
  { title: 'Elektryk - instalacje elektryczne, pomiary', description: 'Instalacje elektryczne w domach i mieszkaniach. Pomiary, protokoły, wymiana tablic. Uprawnienia SEP.', source_portal: 'olx', category: 'instalacje', location_text: 'Szczecin, Niebuszewo', latitude: 53.4468, longitude: 14.5622, price: 100 },
  { title: 'Wykończenia wnętrz - malowanie, gładzie, tapety', description: 'Profesjonalne wykończenia wnętrz. Gładzie gipsowe, malowanie natryskowe, tapetowanie.', source_portal: 'oferteo', category: 'wykończenia', location_text: 'Szczecin, Gumieńce', latitude: 53.3973, longitude: 14.5064, price: 60 },
  { title: 'Budowa domów jednorodzinnych pod klucz', description: 'Domy jednorodzinne od fundamentów po dach. Stan surowy, surowy zamknięty, pod klucz.', source_portal: 'olx', category: 'budowa', location_text: 'Police', latitude: 53.5513, longitude: 14.5692, price: null },
  { title: 'Docieplenia budynków - styropian, wełna', description: 'Ocieplanie budynków metodą BSO. Styropian, wełna, kleje, tynki. Realizacja Szczecin i okolice.', source_portal: 'olx', category: 'budowa', location_text: 'Szczecin, Prawobrzeże', latitude: 53.4090, longitude: 14.6133, price: 150 },
  { title: 'Układanie płytek - łazienki, kuchnie', description: 'Profesjonalne układanie płytek ceramicznych i gresowych. Łazienki od A do Z, hydroizolacja.', source_portal: 'oferteo', category: 'wykończenia', location_text: 'Szczecin, Bezrzecze', latitude: 53.3683, longitude: 14.5789, price: 90 },
  { title: 'Usługi dekarskie - dachy, rynny, obróbki', description: 'Pokrycia dachowe: blachodachówka, dachówka, papa. Wymiana rynien, obróbek blacharskich.', source_portal: 'olx', category: 'budowa', location_text: 'Stargard', latitude: 53.3362, longitude: 15.0500, price: 200 },
  { title: 'Montaż okien i drzwi - PCV, aluminium', description: 'Wymiana i montaż okien PCV, aluminiowych. Drzwi wejściowe, wewnętrzne. Pomiar gratis.', source_portal: 'olx', category: 'instalacje', location_text: 'Szczecin, Dąbie', latitude: 53.4539, longitude: 14.5281, price: null },
  { title: 'Tynki maszynowe, posadzki, wylewki', description: 'Tynki gipsowe i cementowo-wapienne maszynowo. Wylewki samopoziomujące. Faktura VAT.', source_portal: 'oferteo', category: 'budowa', location_text: 'Goleniów', latitude: 53.5640, longitude: 14.8298, price: 35 },
  { title: 'Ogrodzenia - panelowe, drewniane, gabionowe', description: 'Montaż ogrodzeń: panele, siatka, drewniane sztachety, gabiony. Bramy przesuwne i skrzydłowe.', source_portal: 'olx', category: 'budowa', location_text: 'Szczecin, Załom', latitude: 53.3932, longitude: 14.6488, price: 180 },
  { title: 'Usługi brukarskie - kostka brukowa', description: 'Układanie kostki brukowej, budowa chodników, podjazdów, parkingów. Własny sprzęt.', source_portal: 'olx', category: 'budowa', location_text: 'Szczecin, Pogodno', latitude: 53.4370, longitude: 14.5210, price: 110 },
  { title: 'Klimatyzacja - montaż, serwis', description: 'Montaż klimatyzacji domowej i biurowej. Serwis, czyszczenie. Certyfikat F-gazowy.', source_portal: 'oferteo', category: 'instalacje', location_text: 'Szczecin, Centrum', latitude: 53.4300, longitude: 14.5550, price: 2500 },
  { title: 'Wyburzenia, rozbiórki, wywóz gruzu', description: 'Wyburzenia ścian, rozbiórki budynków, kucie betonu. Wywóz gruzu kontenerem.', source_portal: 'olx', category: 'budowa', location_text: 'Gryfino', latitude: 53.2538, longitude: 14.4889, price: 50 },
  { title: 'Podłogi - panele, deska, winyl LVT', description: 'Układanie paneli podłogowych, deski barlineckiej, wykładzin LVT/SPC. Wyrównywanie podłoży.', source_portal: 'olx', category: 'wykończenia', location_text: 'Szczecin, Niebuszewo', latitude: 53.4450, longitude: 14.5600, price: 45 },
  { title: 'Firma budowlana - generalny wykonawca', description: 'Kompleksowa obsługa inwestycji budowlanych. Od projektu po odbiór. Domy, lokale, hale.', source_portal: 'oferteo', category: 'budowa', location_text: 'Szczecin', latitude: 53.4250, longitude: 14.5480, price: null },
  { title: 'Instalacje gazowe - piece, kotły', description: 'Montaż kotłów gazowych, pieców, kominków. Przeglądy gazowe, protokoły. Uprawnienia.', source_portal: 'olx', category: 'instalacje', location_text: 'Police', latitude: 53.5480, longitude: 14.5730, price: 300 },
  { title: 'Malowanie mieszkań - szybko i tanio', description: 'Malowanie ścian i sufitów. Szpachlowanie, gruntowanie. Od 12 zł/m². Farby klienta lub moje.', source_portal: 'olx', category: 'wykończenia', location_text: 'Szczecin, Centrum', latitude: 53.4295, longitude: 14.5540, price: 12 },
  { title: 'Prace ziemne - koparki, minikoparki', description: 'Usługi koparką i minikoparką. Wykopy pod fundamenty, przyłącza, baseny. Transport ziemi.', source_portal: 'olx', category: 'budowa', location_text: 'Goleniów', latitude: 53.5600, longitude: 14.8350, price: 180 },
  { title: 'Regipsy, sufity podwieszane, zabudowy GK', description: 'Montaż ścianek z płyt GK, sufitów podwieszanych, zabudów instalacji. Certyfikat Knauf.', source_portal: 'oferteo', category: 'wykończenia', location_text: 'Szczecin, Gumieńce', latitude: 53.4000, longitude: 14.5100, price: 55 },
];

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const seedSecret = process.env.SEED_SECRET;

  if (process.env.NODE_ENV === 'production') {
    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (seedSecret && authHeader === `Bearer ${seedSecret}`);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Seed endpoint is disabled in production' },
        { status: 403 }
      );
    }
  }

  try {
    const batch = adminFirestore.batch();
    const now = new Date();

    for (let i = 0; i < ANNOUNCEMENTS.length; i++) {
      const ad = ANNOUNCEMENTS[i];
      const id = `seed_${ad.source_portal}_${i}`;
      const docRef = adminFirestore.collection('announcements').doc(id);

      batch.set(docRef, {
        deduplication_key: id,
        title: ad.title,
        description: ad.description,
        source_url: ad.source_portal === 'olx'
          ? `https://www.olx.pl/praca/szczecin/q-${encodeURIComponent(ad.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40))}/`
          : `https://www.oferteo.pl/remont-i-wykonczenie-mieszkan/szczecin`,
        source_portal: ad.source_portal,
        category: ad.category,
        location_text: ad.location_text,
        latitude: ad.latitude,
        longitude: ad.longitude,
        price: ad.price,
        contact_info: null,
        scraped_at: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        published_at: new Date(now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000),
      }, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Added ${ANNOUNCEMENTS.length} construction announcements to Firestore`,
      count: ANNOUNCEMENTS.length,
    });
  } catch (error) {
    console.error('Seed failed:', error);
    return NextResponse.json(
      { success: false, error: 'Seed failed - check service account key' },
      { status: 200 }
    );
  }
}
