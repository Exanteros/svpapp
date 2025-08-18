'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AGBPage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>
          
          <div className="prose prose-lg max-w-none">
            {/* Einleitung */}
            <section className="mb-8">
              <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
                <p className="mb-4">
                  Diese Allgemeinen Geschäftsbedingungen gelten für die Anmeldung und Teilnahme am 
                  Handball-Turnier des SV Puschendorf 1949 e.V. in Kooperation mit der Contimore UG (haftungsbeschränkt).
                </p>
                <p>
                  <strong>Stand:</strong> August 2025
                </p>
              </div>
            </section>

            {/* Anbieter und Vertragspartner */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 1 Anbieter und Vertragspartner</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>Anbieter der Online-Plattform:</strong>
                </p>
                <p className="mb-2">Contimore UG (haftungsbeschränkt)</p>
                <p className="mb-2">Geschäftsführer: Cedric Geißdörfer</p>
                <p className="mb-2">Asternstraße 17, 90617 Puschendorf</p>
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
                
                <p className="mb-4">
                  <strong>Veranstalter des Turniers:</strong>
                </p>
                <p className="mb-2">Sportverein Puschendorf 1949 e.V.</p>
                <p className="mb-2">Handballabteilung</p>
                
                <p className="mt-4 text-sm text-gray-600">
                  Der Vertrag über die Turnierteilnahme kommt zwischen dem anmeldenden Verein/Team 
                  und dem SV Puschendorf 1949 e.V. zustande.
                </p>
              </div>
            </section>

            {/* Vertragsgegenstand */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 2 Vertragsgegenstand</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Gegenstand des Vertrages ist die Teilnahme am Handball-Turnier des SV Puschendorf, 
                  welches voraussichtlich am 5. und 6. Juli 2025 stattfindet.
                </p>
                <p className="mb-4">
                  <strong>Die Leistungen umfassen:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Bereitstellung von Spielfeldern und Sportgeräten</li>
                  <li>Organisation des Spielbetriebs gemäß Turnierordnung</li>
                  <li>Schiedsrichterstellung</li>
                  <li>Turnierleitung und -verwaltung</li>
                  <li>Ehrungen und Preisverleihung</li>
                  <li>Verpflegungsmöglichkeiten (optional)</li>
                </ul>
                <p className="mt-4 text-sm text-gray-600">
                  Genaue Termine, Uhrzeiten und weitere Details werden nach Anmeldeschluss bekannt gegeben.
                </p>
              </div>
            </section>

            {/* Anmeldung und Vertragsschluss */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 3 Anmeldung und Vertragsschluss</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>3.1</strong> Die Anmeldung erfolgt über das Online-Formular auf dieser Website. 
                  Mit der Anmeldung gibt der Verein/das Team ein verbindliches Angebot auf Abschluss 
                  eines Teilnahmevertrages ab.
                </p>
                <p className="mb-4">
                  <strong>3.2</strong> Der Vertrag kommt durch die Bestätigung der Anmeldung durch den 
                  SV Puschendorf per E-Mail zustande. Die Bestätigung erfolgt in der Regel innerhalb 
                  von 7 Werktagen nach Anmeldung.
                </p>
                <p className="mb-4">
                  <strong>3.3</strong> Bei Überschreitung der maximalen Teilnehmerzahl entscheidet das 
                  Anmeldedatum über die Teilnahme (first come, first served). Nicht berücksichtigte 
                  Teams werden umgehend informiert.
                </p>
                <p className="mb-4">
                  <strong>3.4</strong> Falsche oder unvollständige Angaben können zur Ablehnung der 
                  Anmeldung oder zum Ausschluss vom Turnier führen.
                </p>
              </div>
            </section>

            {/* Teilnahmegebühren */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 4 Teilnahmegebühren und Zahlung</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>4.1</strong> Die Teilnahmegebühren werden nach Kategorien gestaffelt und sind 
                  der Anmeldebestätigung zu entnehmen. Die Gebühren sind in Euro zu entrichten.
                </p>
                <p className="mb-4">
                  <strong>4.2</strong> Die Zahlung erfolgt per Überweisung auf das in der Anmeldebestätigung 
                  genannte Konto. Die Zahlungsfrist beträgt 14 Tage nach Erhalt der Anmeldebestätigung.
                </p>
                <p className="mb-4">
                  <strong>4.3</strong> Bei Nichtzahlung innerhalb der Frist behält sich der Veranstalter 
                  vor, das Team vom Turnier auszuschließen und den Platz anderweitig zu vergeben.
                </p>
                <p className="mb-4">
                  <strong>4.4</strong> Mahngebühren bei verspäteter Zahlung betragen 5 Euro pro Mahnung.
                </p>
              </div>
            </section>

            {/* Teilnahmebedingungen */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 5 Teilnahmebedingungen</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>5.1 Art des Turniers:</strong> Es handelt sich um ein Freizeitturnier ohne offizielle 
                  Wertung oder Ligabezug. Im Vordergrund stehen Spaß am Spiel und faire Begegnungen.
                </p>
                <p className="mb-4">
                  <strong>5.2 Teilnahmeberechtigung:</strong> Teilnahmeberechtigt sind Teams von Vereinen, 
                  Schulen, Freizeitgruppen oder sonstige Mannschaften. Eine Vereinszugehörigkeit ist nicht zwingend erforderlich.
                </p>
                <p className="mb-4">
                  <strong>5.3 Altersklassen:</strong> Die Teams werden in entsprechende Altersgruppen eingeteilt. 
                  Eine strenge Alterskontrolle findet nicht statt - wir vertrauen auf ehrliche Angaben der Teams.
                </p>
                <p className="mb-4">
                  <strong>5.4 Versicherung:</strong> Jeder Teilnehmer nimmt auf eigene Verantwortung teil. 
                  Eine gültige Krankenversicherung wird empfohlen. Der Veranstalter übernimmt keine Haftung für Unfälle.
                </p>
                <p className="mb-4">
                  <strong>5.5 Ausrüstung:</strong> Teams sind selbst für ihre Sportbekleidung verantwortlich. 
                  Spielbälle werden gestellt.
                </p>
                <p className="mb-4">
                  <strong>5.6 Fair Play:</strong> Von allen Teilnehmern wird sportliches Verhalten und 
                  Fairness erwartet. Unsportliches Verhalten kann zum Ausschluss führen.
                </p>
              </div>
            </section>

            {/* Turnierordnung */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 6 Turnierordnung und Regeln</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>6.1</strong> Das Turnier wird nach vereinfachten Handballregeln durchgeführt, 
                  angepasst an den Freizeitcharakter der Veranstaltung. Genaue Spielregeln werden 
                  vor Turnierbeginn bekannt gegeben.
                </p>
                <p className="mb-4">
                  <strong>6.2</strong> Die Turnierleitung kann Regelanpassungen vornehmen, um einen 
                  reibungslosen und fairen Ablauf zu gewährleisten. Diese werden rechtzeitig kommuniziert.
                </p>
                <p className="mb-4">
                  <strong>6.3</strong> Entscheidungen der Turnierleitung und der Schiedsrichter sind 
                  im Sinne des Turnierfriedens zu respektieren. Bei Meinungsverschiedenheiten steht 
                  das faire Miteinander im Vordergrund.
                </p>
                <p className="mb-4">
                  <strong>6.4</strong> Bei wiederholtem unsportlichem Verhalten oder Störung des 
                  Turnierablaufs können Teams nach Ermahnung vom Turnier ausgeschlossen werden.
                </p>
                <p className="mb-4">
                  <strong>6.5</strong> Alkohol und andere berauschende Mittel sind während der 
                  Spielzeiten untersagt.
                </p>
              </div>
            </section>

            {/* Stornierung und Rücktritt */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 7 Stornierung und Rücktritt</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>7.1 Rücktritt durch das Team:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Bis 4 Wochen vor Turnierbeginn: kostenlos</li>
                  <li>Bis 2 Wochen vor Turnierbeginn: 50% der Teilnahmegebühr</li>
                  <li>Danach: 100% der Teilnahmegebühr</li>
                </ul>
                <p className="mb-4">
                  <strong>7.2 Absage durch den Veranstalter:</strong> Bei Absage des Turniers durch den 
                  Veranstalter werden bereits gezahlte Gebühren vollständig erstattet. Weitergehende 
                  Ansprüche bestehen nicht.
                </p>
                <p className="mb-4">
                  <strong>7.3 Höhere Gewalt:</strong> Bei Absage aufgrund höherer Gewalt (z.B. Pandemie, 
                  Naturkatastrophen) erfolgt Rückerstattung abzüglich bereits entstandener Kosten.
                </p>
              </div>
            </section>

            {/* Haftung */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 7 Haftung und Versicherung</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>7.1</strong> Die Teilnahme am Turnier erfolgt auf eigene Gefahr. Jeder 
                  Teilnehmer ist für seine körperliche Verfassung und Eignung für den Sport selbst 
                  verantwortlich.
                </p>
                <p className="mb-4">
                  <strong>7.2</strong> Die Veranstalter haften nicht für Schäden, die während des 
                  Turniers entstehen, es sei denn, diese beruhen auf vorsätzlichem oder grob 
                  fahrlässigem Verhalten der Veranstalter.
                </p>
                <p className="mb-4">
                  <strong>7.3</strong> Den Teilnehmern wird dringend empfohlen, über eine geeignete 
                  Sportversicherung zu verfügen.
                </p>
                <p className="mb-4">
                  <strong>7.4</strong> Für Diebstahl oder Beschädigung von persönlichen Gegenständen 
                  wird keine Haftung übernommen.
                </p>
                <p className="mb-4">
                  <strong>7.5</strong> Die Teilnehmer verpflichten sich, eventuell entstehende Schäden 
                  an der Sportstätte oder dem Equipment unverzüglich zu melden.
                </p>
              </div>
            </section>

            {/* Datenschutz */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 9 Datenschutz</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>9.1</strong> Die erhobenen personenbezogenen Daten werden ausschließlich zur 
                  Durchführung des Turniers verwendet und nach Abschluss des Turniers gelöscht.
                </p>
                <p className="mb-4">
                  <strong>9.2</strong> Detaillierte Informationen zum Datenschutz finden Sie in unserer 
                  <Link href="/datenschutz" className="text-orange-600 hover:text-orange-700">
                    Datenschutzerklärung
                  </Link>.
                </p>
                <p className="mb-4">
                  <strong>9.3</strong> Foto- und Videoaufnahmen während des Turniers können für 
                  Dokumentations- und Werbezwecke verwendet werden. Widerspruch ist jederzeit möglich.
                </p>
              </div>
            </section>

            {/* Schlussbestimmungen */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 10 Schlussbestimmungen</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>10.1</strong> Es gilt das Recht der Bundesrepublik Deutschland.
                </p>
                <p className="mb-4">
                  <strong>10.2</strong> Gerichtsstand ist, soweit zulässig, Fürth.
                </p>
                <p className="mb-4">
                  <strong>10.3</strong> Sollten einzelne Bestimmungen dieser AGB unwirksam sein, 
                  berührt dies nicht die Wirksamkeit der übrigen Bestimmungen.
                </p>
                <p className="mb-4">
                  <strong>10.4</strong> Änderungen und Ergänzungen dieser AGB bedürfen der Textform.
                </p>
                <p className="mb-4">
                  <strong>10.5</strong> Diese AGB sind in deutscher Sprache verfasst. Bei Übersetzungen 
                  ist die deutsche Fassung maßgeblich.
                </p>
              </div>
            </section>

            {/* Besondere Hinweise */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">§ 11 Besondere Hinweise</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>11.1 Corona/Hygienemaßnahmen:</strong> Je nach aktueller Lage können besondere 
                  Hygiene- und Schutzmaßnahmen erforderlich sein. Diese werden rechtzeitig kommuniziert 
                  und sind von allen Teilnehmern zu befolgen.
                </p>
                <p className="mb-4">
                  <strong>11.2 Wetter:</strong> Bei Schlecht-Wetter-Bedingungen können Spiele verlegt 
                  oder abgesagt werden. Die Turnierleitung entscheidet nach eigenem Ermessen.
                </p>
                <p className="mb-4">
                  <strong>11.3 Verpflegung:</strong> Für Verpflegung wird vor Ort gesorgt. Externe 
                  Verpflegung kann eingeschränkt oder untersagt werden.
                </p>
              </div>
            </section>

            {/* Kontakt */}
            <section className="mb-8">
              <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Fragen zu den AGB?</h3>
                <p className="mb-4">
                  Bei Fragen zu diesen Geschäftsbedingungen wenden Sie sich gerne an uns:
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
                <p className="text-sm text-gray-600 mt-4">
                  <strong>Hinweis:</strong> Mit der Anmeldung zum Turnier erklären Sie sich mit diesen 
                  AGB einverstanden.
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
