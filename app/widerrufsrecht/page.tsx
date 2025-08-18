'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function WiderrufsrechtPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* Handball Ball Icon */}
              <div className="relative w-8 h-8">
                <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full opacity-30"></div>
              </div>
              <h1 className="text-xl font-bold text-gray-900">SV Puschendorf</h1>
            </div>
            
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Zurück zur Hauptseite
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Widerrufsrecht</h1>
          
          <div className="prose prose-lg max-w-none">
            {/* Einleitung */}
            <section className="mb-8">
              <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
                <p className="mb-4">
                  <strong>Wichtiger Hinweis:</strong> Die Contimore UG stellt lediglich die technische 
                  Plattform für die Turnieranmeldung bereit. Der Teilnahmevertrag kommt direkt zwischen 
                  Ihrem Team und dem SV Puschendorf 1949 e.V. zustande.
                </p>
                <p className="mb-4">
                  Da es sich um eine Sportveranstaltung mit festem Termin handelt und der SV Puschendorf 
                  als gemeinnütziger Verein agiert, gelten besondere Bedingungen für das Widerrufsrecht.
                </p>
                <p>
                  <strong>Stand:</strong> August 2025
                </p>
              </div>
            </section>

            {/* Widerrufsrecht */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Anwendbarkeit des Widerrufsrechts</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>Plattformanbieter:</strong> Die Contimore UG stellt ausschließlich die technische 
                  Plattform für Anmeldungen bereit. Es besteht kein direktes Vertragsverhältnis zwischen 
                  der Contimore UG und den anmeldenden Teams bezüglich der Turnierteilnahme.
                </p>
                <p className="mb-4">
                  <strong>Vertragspartner:</strong> Der Teilnahmevertrag kommt zwischen Ihrem Team und dem 
                  <strong> SV Puschendorf 1949 e.V.</strong> zustande, einem gemeinnützigen Sportverein.
                </p>
                <p className="mb-4">
                  <strong>Besonderheiten bei Sportveranstaltungen:</strong> Da es sich um eine Veranstaltung 
                  mit festem Termin handelt und der Verein erhebliche Vorleistungen erbringt (Hallenmiete, 
                  Schiedsrichter, Catering-Planung), können besondere Stornierungsbedingungen gelten.
                </p>
                <p className="mb-4">
                  <strong>Empfehlung:</strong> Für rechtliche Fragen zum Widerrufsrecht wenden Sie sich 
                  direkt an den SV Puschendorf 1949 e.V. Die praktischen Stornierungsmöglichkeiten 
                  finden Sie in unseren <Link href="/agb" className="text-orange-600 hover:text-orange-700">AGB</Link>.
                </p>
              </div>
            </section>

            {/* Stornierungsmöglichkeiten */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Praktische Stornierungsmöglichkeiten</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Unabhängig von formellen Widerrufsrechten bietet der SV Puschendorf 1949 e.V. 
                  faire Stornierungsmöglichkeiten:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li><strong>Bis 4 Wochen vor Turnierbeginn:</strong> Kostenlose Stornierung</li>
                  <li><strong>Bis 2 Wochen vor Turnierbeginn:</strong> 50% der Teilnahmegebühr</li>
                  <li><strong>Danach:</strong> 100% der Teilnahmegebühr (aufgrund bereits getätigter Vorleistungen)</li>
                </ul>
                <p className="mb-4">
                  Diese Regelungen berücksichtigen die besonderen Umstände einer Sportveranstaltung 
                  und die Planungssicherheit für den Verein.
                </p>
              </div>
            </section>

            {/* Kontakt für Stornierungen */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Kontakt für Stornierungen</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>Für Stornierungen wenden Sie sich bitte direkt an:</strong>
                </p>
                <div className="mb-4">
                  <p className="mb-2"><strong>SV Puschendorf 1949 e.V. - Handballabteilung</strong></p>
                  <p className="mb-4">
                    E-Mail: 
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        const email = 'die.goetzelmaenner' + '@' + 'gmail.com';
                        window.location.href = 'mailto:' + email;
                      }}
                      className="text-orange-600 hover:text-orange-700 ml-1"
                    >
                      die.goetzelmaenner [at] gmail [dot] com
                    </a>
                  </p>
                </div>
                <p className="mb-4">
                  <strong>Für technische Fragen zur Plattform:</strong>
                </p>
                <div className="mb-4">
                  <p className="mb-2"><strong>Contimore UG (haftungsbeschränkt)</strong></p>
                  <p className="mb-4">
                    E-Mail: 
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        const email = 'hi' + '@' + 'contimore.de';
                        window.location.href = 'mailto:' + email;
                      }}
                      className="text-orange-600 hover:text-orange-700 ml-1"
                    >
                      hi [at] contimore [dot] de
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* Rechtliche Einordnung */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Rechtliche Einordnung</h2>
              <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-400">
                <p className="mb-4">
                  <strong>Warum kein klassisches Widerrufsrecht?</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Die Contimore UG ist nur technischer Dienstleister, nicht Vertragspartner für die Turnierteilnahme</li>
                  <li>Der SV Puschendorf 1949 e.V. ist ein gemeinnütziger Verein, kein gewerblicher Anbieter</li>
                  <li>Sportveranstaltungen mit festem Termin unterliegen besonderen Regelungen</li>
                  <li>Es handelt sich um ein Freizeitturnier ohne kommerzielle Gewinnabsicht</li>
                </ul>
                <p className="mb-4">
                  <strong>Dennoch fair:</strong> Der Verein bietet trotzdem großzügige Stornierungsmöglichkeiten, 
                  die über gesetzliche Mindestanforderungen hinausgehen.
                </p>
              </div>
            </section>

            {/* Praktische Hinweise */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Praktische Hinweise</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>Einfache Stornierung:</strong> Für eine Stornierung genügt eine einfache 
                  E-Mail an die Handballabteilung des SV Puschendorf. Keine komplizierten Formulare nötig.
                </p>
                <p className="mb-4">
                  <strong>Schnelle Bearbeitung:</strong> Stornierungen werden in der Regel innerhalb 
                  von 2 Werktagen bearbeitet.
                </p>
                <p className="mb-4">
                  <strong>Transparente Kosten:</strong> Die Stornierungskosten sind klar definiert und 
                  berücksichtigen die tatsächlich entstehenden Kosten für den Verein.
                </p>
                <p className="mb-4">
                  <strong>Kulanz:</strong> Bei besonderen Umständen (Krankheit, etc.) ist der Verein 
                  gerne bereit, individuelle Lösungen zu finden.
                </p>
              </div>
            </section>

            {/* Kontakt */}
            <section className="mb-8">
              <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Fragen zu Stornierungen?</h3>
                <p className="mb-4">
                  Bei Fragen zu Stornierungen oder zur Anmeldung wenden Sie sich gerne an:
                </p>
                <p className="mb-2">
                  <strong>Turnier-Organisation:</strong><br />
                  E-Mail: 
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      const email = 'die.goetzelmaenner' + '@' + 'gmail.com';
                      window.location.href = 'mailto:' + email;
                    }}
                    className="text-orange-600 hover:text-orange-700 ml-1"
                  >
                    die.goetzelmaenner [at] gmail [dot] com
                  </a>
                </p>
                <p className="mb-2">
                  <strong>Technische Fragen:</strong><br />
                  E-Mail: 
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      const email = 'hi' + '@' + 'contimore.de';
                      window.location.href = 'mailto:' + email;
                    }}
                    className="text-orange-600 hover:text-orange-700 ml-1"
                  >
                    hi [at] contimore [dot] de
                  </a>
                </p>
                <p className="text-sm text-gray-600 mt-4">
                  <strong>Hinweis:</strong> Stornierungen werden in der Regel innerhalb von 2 Werktagen bearbeitet.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-6 h-6">
                <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full opacity-30"></div>
              </div>
              <span className="font-semibold text-sm">SV Puschendorf</span>
            </div>
            <p className="text-gray-400 text-xs text-center sm:text-left">
              © 2025 Contimore UG (haftungsbeschränkt) & Sportverein Puschendorf 1949 e.V.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
