'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImpressumPage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Impressum</h1>
          
          <div className="prose prose-lg max-w-none">
            {/* Anbieter */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Anbieter</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>Contimore UG (haftungsbeschränkt)</strong><br />
                  in Kooperation mit der Handballabteilung des<br />
                  <strong>Sportverein Puschendorf 1949 e.V.</strong>
                </p>
              </div>
            </section>

            {/* Kontaktdaten Contimore UG */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Kontaktdaten des Anbieters</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-2"><strong>Contimore UG (haftungsbeschränkt)</strong></p>
                <p className="mb-2">Geschäftsführer: Cedric Geißdörfer</p>
                <p className="mb-2">Anschrift: Asternstraße 17</p>
                <p className="mb-2">90617 Puschendorf</p>
                <p className="mb-2">Deutschland</p>
                <p className="mb-2">
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
            </section>

            {/* Registereintrag */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Registereintrag</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-2">Eintragung im Handelsregister</p>
                <p className="mb-2">Registergericht: Fürth</p>
                <p className="mb-2">Registernummer: HRB 21432</p>
                <p className="mb-2">Umsatzsteuer-Identifikationsnummer: DE450472692</p>
              </div>
            </section>

            {/* Kooperationspartner */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Kooperationspartner</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-2"><strong>Sportverein Puschendorf 1949 e.V.</strong></p>
              </div>
            </section>

            {/* Verantwortlich für den Inhalt */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-2">Contimore UG (haftungsbeschränkt)</p>
                <p className="mb-2">Asternstraße 17</p>
                <p className="mb-2">90617 Puschendorf</p>
              </div>
            </section>

            {/* Streitschlichtung */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Streitschlichtung</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
                  <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 ml-1">
                    https://ec.europa.eu/consumers/odr/
                  </a>
                </p>
                <p>
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </section>

            {/* Haftungsausschluss */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Haftungsausschluss</h2>
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Inhalt des Onlineangebotes</h3>
                  <p>
                    Der Autor übernimmt keinerlei Gewähr für die Aktualität, Korrektheit, Vollständigkeit 
                    oder Qualität der bereitgestellten Informationen. Haftungsansprüche gegen den Autor, 
                    welche sich auf Schäden materieller oder ideeller Art beziehen, die durch die Nutzung 
                    oder Nichtnutzung der dargebotenen Informationen bzw. durch die Nutzung fehlerhafter 
                    und unvollständiger Informationen verursacht wurden, sind grundsätzlich ausgeschlossen.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Verweise und Links</h3>
                  <p>
                    Bei direkten oder indirekten Verweisen auf fremde Internetseiten ("Links"), die außerhalb 
                    des Verantwortungsbereiches des Autors liegen, würde eine Haftungsverpflichtung ausschließlich 
                    in dem Fall in Kraft treten, in dem der Autor von den Inhalten Kenntnis hat und es ihm 
                    technisch möglich und zumutbar wäre, die Nutzung im Falle rechtswidriger Inhalte zu verhindern.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Urheberrecht</h3>
                  <p>
                    Der Autor ist bestrebt, in allen Publikationen die Urheberrechte der verwendeten Grafiken, 
                    Tondokumente, Videosequenzen und Texte zu beachten, von ihm selbst erstellte Grafiken, 
                    Tondokumente, Videosequenzen und Texte zu nutzen oder auf lizenzfreie Grafiken, Tondokumente, 
                    Videosequenzen und Texte zurückzugreifen.
                  </p>
                </div>
              </div>
            </section>

            {/* Rechtswirksamkeit */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Rechtswirksamkeit des Disclaimers</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p>
                  Dieser Disclaimer ist als Teil des Internetangebotes zu betrachten, von dem aus auf diese 
                  Seite verwiesen wurde. Sofern Teile oder einzelne Formulierungen dieses Textes der geltenden 
                  Rechtslage nicht, nicht mehr oder nicht vollständig entsprechen sollten, bleiben die übrigen 
                  Teile des Dokumentes in ihrem Inhalt und ihrer Gültigkeit davon unberührt.
                </p>
              </div>
            </section>

            {/* Aktualisierung */}
            <section className="mb-8">
              <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
                <p className="text-sm text-gray-600">
                  <strong>Hinweis:</strong> Stand: August 2025. Dieses Impressum wird regelmäßig überprüft 
                  und bei Bedarf aktualisiert.
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
