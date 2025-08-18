'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DatenschutzPage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>
          
          <div className="prose prose-lg max-w-none">
            {/* Einleitung */}
            <section className="mb-8">
              <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
                <p className="mb-4">
                  Wir freuen uns über Ihr Interesse an unserer Website. Der Schutz Ihrer personenbezogenen 
                  Daten ist uns ein wichtiges Anliegen. In dieser Datenschutzerklärung informieren wir Sie 
                  über die Verarbeitung personenbezogener Daten bei der Nutzung dieser Website.
                </p>
                <p>
                  <strong>Stand:</strong> August 2025
                </p>
              </div>
            </section>

            {/* Verantwortlicher */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Verantwortlicher</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
                </p>
                <p className="mb-2"><strong>Contimore UG (haftungsbeschränkt)</strong></p>
                <p className="mb-2">Geschäftsführer: Cedric Geißdörfer</p>
                <p className="mb-2">Asternstraße 17</p>
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

            {/* Rechtsgrundlagen */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Rechtsgrundlagen der Verarbeitung</h2>
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <p>
                  Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage der folgenden Rechtsgrundlagen:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Art. 6 Abs. 1 lit. a DSGVO:</strong> Einwilligung der betroffenen Person</li>
                  <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Vertragserfüllung oder vorvertragliche Maßnahmen</li>
                  <li><strong>Art. 6 Abs. 1 lit. c DSGVO:</strong> Erfüllung rechtlicher Verpflichtungen</li>
                  <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Berechtigte Interessen des Verantwortlichen</li>
                </ul>
              </div>
            </section>

            {/* Erhebung von Daten */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Erhebung und Verarbeitung von Daten</h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">3.1 Website-Besuch</h3>
                  <p className="mb-3">
                    Bei jedem Aufruf unserer Website werden durch Ihren Browser automatisch Informationen 
                    an unseren Server übermittelt und in sogenannten Log-Dateien gespeichert:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>IP-Adresse des anfragenden Rechners</li>
                    <li>Datum und Uhrzeit des Zugriffs</li>
                    <li>Name und URL der abgerufenen Datei</li>
                    <li>Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>
                    <li>Verwendeter Browser und ggf. das Betriebssystem</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der 
                    Gewährleistung der Systemsicherheit und -optimierung)
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">3.2 Team-Anmeldung</h3>
                  <p className="mb-3">
                    Bei der Anmeldung Ihres Teams für das Handball-Turnier erheben wir folgende Daten:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Teamname und Vereinsname</li>
                    <li>Kontaktdaten des Ansprechpartners (Name, E-Mail, Telefon)</li>
                    <li>Kategorie und Altersklasse</li>
                    <li>Anzahl der Spieler</li>
                    <li>Besondere Wünsche oder Anmerkungen</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">3.3 E-Mail-Kontakt</h3>
                  <p className="mb-3">
                    Bei Kontaktaufnahme per E-Mail werden die übermittelten Daten gespeichert, um Ihre 
                    Anfrage bearbeiten zu können.
                  </p>
                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse 
                    an der Beantwortung von Anfragen)
                  </p>
                </div>
              </div>
            </section>

            {/* Weitergabe von Daten */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Weitergabe von Daten</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Eine Übermittlung Ihrer personenbezogenen Daten an Dritte findet nur statt, wenn:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Sie hierzu ausdrücklich eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO)</li>
                  <li>Dies zur Vertragserfüllung erforderlich ist (Art. 6 Abs. 1 lit. b DSGVO)</li>
                  <li>Eine gesetzliche Verpflichtung besteht (Art. 6 Abs. 1 lit. c DSGVO)</li>
                  <li>Dies zur Wahrung berechtigter Interessen erforderlich ist (Art. 6 Abs. 1 lit. f DSGVO)</li>
                </ul>
                <p className="mt-4">
                  <strong>Kooperationspartner:</strong> Daten können an den Sportverein Puschendorf 1949 e.V. 
                  weitergegeben werden, soweit dies zur Durchführung des Turniers erforderlich ist.
                </p>
              </div>
            </section>

            {/* Speicherdauer */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Speicherdauer</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <ul className="space-y-3">
                  <li>
                    <strong>Log-Dateien:</strong> Werden nach 7 Tagen automatisch gelöscht
                  </li>
                  <li>
                    <strong>Anmeldedaten:</strong> Werden nach Abschluss des Turniers und Ablauf etwaiger 
                    Gewährleistungsfristen gelöscht, spätestens nach 2 Jahren
                  </li>
                  <li>
                    <strong>E-Mail-Korrespondenz:</strong> Wird nach Erledigung der Anfrage gelöscht, 
                    spätestens nach 2 Jahren
                  </li>
                </ul>
              </div>
            </section>

            {/* Ihre Rechte */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Ihre Rechte</h2>
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <p className="mb-4">
                  Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Auskunftsrecht (Art. 15 DSGVO)</h4>
                    <p className="text-sm text-gray-600">
                      Sie haben das Recht zu erfahren, ob und welche Daten wir von Ihnen verarbeiten.
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Berichtigungsrecht (Art. 16 DSGVO)</h4>
                    <p className="text-sm text-gray-600">
                      Sie können die Berichtigung unrichtiger Daten verlangen.
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Löschungsrecht (Art. 17 DSGVO)</h4>
                    <p className="text-sm text-gray-600">
                      Sie können die Löschung Ihrer Daten verlangen, soweit keine Aufbewahrungspflichten bestehen.
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Einschränkungsrecht (Art. 18 DSGVO)</h4>
                    <p className="text-sm text-gray-600">
                      Sie können die Einschränkung der Verarbeitung verlangen.
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Datenübertragbarkeit (Art. 20 DSGVO)</h4>
                    <p className="text-sm text-gray-600">
                      Sie können die Übertragung Ihrer Daten an einen anderen Verantwortlichen verlangen.
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Widerspruchsrecht (Art. 21 DSGVO)</h4>
                    <p className="text-sm text-gray-600">
                      Sie können der Verarbeitung Ihrer Daten widersprechen.
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-sm">
                    <strong>Widerruf der Einwilligung:</strong> Haben Sie in die Verarbeitung eingewilligt, 
                    können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen.
                  </p>
                </div>
              </div>
            </section>

            {/* Sicherheit */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Datensicherheit</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten 
                  gegen zufällige oder vorsätzliche Manipulationen, Verlust, Zerstörung oder den Zugriff 
                  unberechtigter Personen zu schützen.
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>SSL/TLS-Verschlüsselung der Website</li>
                  <li>Regelmäßige Sicherheitsupdates</li>
                  <li>Zugriffsbeschränkungen und Berechtigungskonzepte</li>
                  <li>Regelmäßige Datensicherungen</li>
                </ul>
              </div>
            </section>

            {/* Cookies und Tracking */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies und Tracking</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Diese Website verwendet grundsätzlich keine Cookies oder Tracking-Tools. 
                  Sollten in Zukunft Cookies eingesetzt werden, werden wir Sie darüber gesondert informieren 
                  und Ihre Einwilligung einholen.
                </p>
                <p className="mb-4">
                  <strong>Session-Storage:</strong> Für die Funktionalität der Website (z.B. Formularinhalte) 
                  können temporäre lokale Speicher verwendet werden, die beim Schließen des Browsers gelöscht werden.
                </p>
              </div>
            </section>

            {/* Externe Dienste */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Externe Dienste</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Diese Website nutzt grundsätzlich keine externen Dienste oder APIs von Drittanbietern. 
                  Sollten in Zukunft externe Dienste eingebunden werden (z.B. Karten, Social Media), 
                  werden wir Sie darüber in dieser Datenschutzerklärung informieren.
                </p>
              </div>
            </section>

            {/* Beschwerderecht */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Beschwerderecht</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung 
                  Ihrer personenbezogenen Daten durch uns zu beschweren.
                </p>
                <p className="mb-2">
                  <strong>Zuständige Aufsichtsbehörde:</strong>
                </p>
                <p className="mb-2">
                  Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)<br />
                  Promenade 18<br />
                  91522 Ansbach<br />
                  Deutschland
                </p>
                <p>
                  Website: 
                  <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 ml-1">
                    www.lda.bayern.de
                  </a>
                </p>
              </div>
            </section>

            {/* Änderungen */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Änderungen der Datenschutzerklärung</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p>
                  Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen 
                  rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der 
                  Datenschutzerklärung umzusetzen. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
                </p>
              </div>
            </section>

            {/* Kontakt */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Kontakt</h2>
              <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
                <p className="mb-4">
                  Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte wenden Sie sich gerne an uns:
                </p>
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
                <p>
                  Post: Contimore UG, Asternstraße 17, 90617 Puschendorf
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
