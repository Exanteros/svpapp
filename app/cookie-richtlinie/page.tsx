'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CookieBanner from "@/components/CookieBanner";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export default function CookieRichtliniePage() {
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const { consent, functionalAllowed } = useCookieConsent();

  const handleOpenCookieSettings = () => {
    setShowCookieBanner(true);
  };
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Cookie-Richtlinie</h1>
          
          <div className="prose prose-lg max-w-none">
            {/* Einleitung */}
            <section className="mb-8">
              <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
                <p className="mb-4">
                  Diese Cookie-Richtlinie erklärt, wie die Handball-Turnier-Website des SV Puschendorf 
                  Cookies und ähnliche Technologien verwendet. Die technische Plattform wird von der 
                  Contimore UG bereitgestellt.
                </p>
                <p className="mb-4">
                  <strong>Unser Versprechen:</strong> Wir verwenden nur die minimal notwendigen Cookies 
                  für das Funktionieren der Turnier-Website. Keine Tracking-, Werbe- oder Analyse-Cookies!
                </p>
                <p>
                  <strong>Stand:</strong> August 2025
                </p>
              </div>
            </section>

            {/* Was sind Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Was sind Cookies?</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Cookies sind kleine Textdateien, die auf Ihrem Gerät (Computer, Tablet oder 
                  Smartphone) gespeichert werden, wenn Sie eine Website besuchen. Sie helfen 
                  dabei, die Website funktionsfähig zu machen und Ihre Benutzererfahrung zu 
                  verbessern.
                </p>
                <p className="mb-4">
                  Cookies können keine Programme ausführen oder Viren auf Ihr Gerät übertragen. 
                  Sie sind lediglich Textdateien und daher grundsätzlich harmlos.
                </p>
              </div>
            </section>

            {/* Welche Cookies verwenden wir */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welche Cookies verwenden wir?</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">1. Unbedingt erforderliche Cookies</h3>
                <p className="mb-4">
                  Diese Cookies sind für das Funktionieren der Turnier-Website absolut notwendig und 
                  können nicht deaktiviert werden:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-6">
                  <li><strong>svp_session:</strong> Für Team-Anmeldungen und Verwaltung</li>
                  <li><strong>csrf_token:</strong> Schutz vor Cross-Site-Request-Forgery (CSRF) Angriffen</li>
                  <li><strong>svp_cookie_consent:</strong> Speichert Ihre Cookie-Präferenzen</li>
                </ul>

                <h3 className="text-lg font-semibold mb-3">2. Funktionale Cookies (Optional)</h3>
                <p className="mb-4">
                  Diese Cookies verbessern die Benutzererfahrung unserer Turnier-Website:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-6">
                  <li><strong>svp_turnier_cache:</strong> Zwischenspeicherung von Turnierdaten für bessere Performance</li>
                  <li><strong>svp_form_data:</strong> Verhindert Datenverlust beim Ausfüllen von Anmeldeformularen</li>
                  <li><strong>svp_ui_preferences:</strong> Speichert Ihre Designeinstellungen (hell/dunkel)</li>
                  <li><strong>svp_user_settings:</strong> Persönliche Einstellungen wie bevorzugte Sprache</li>
                </ul>

                <h3 className="text-lg font-semibold mb-3">3. Was wir NICHT verwenden</h3>
                <p className="mb-4">
                  <strong>Garantie:</strong> Wir verwenden bewusst <u>keine</u> Cookies für:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>❌ Tracking oder Analyse des Nutzerverhaltens</li>
                  <li>❌ Google Analytics oder ähnliche Tracking-Tools</li>
                  <li>❌ Werbung, Marketing oder Retargeting</li>
                  <li>❌ Weitergabe von Daten an Drittanbieter</li>
                  <li>❌ Social Media Tracking (Facebook Pixel, etc.)</li>
                  <li>❌ Profilerstellung oder Targeting</li>
                </ul>
              </div>
            </section>

            {/* Cookie-Details */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Detaillierte Cookie-Information</h2>
              <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-3 font-semibold">Cookie-Name</th>
                      <th className="text-left py-2 px-3 font-semibold">Zweck</th>
                      <th className="text-left py-2 px-3 font-semibold">Dauer</th>
                      <th className="text-left py-2 px-3 font-semibold">Typ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3">svp_session</td>
                      <td className="py-2 px-3">Team-Anmeldung und Session-Verwaltung</td>
                      <td className="py-2 px-3">Browser-Session</td>
                      <td className="py-2 px-3">Erforderlich</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3">csrf_token</td>
                      <td className="py-2 px-3">Sicherheit gegen CSRF-Angriffe</td>
                      <td className="py-2 px-3">Browser-Session</td>
                      <td className="py-2 px-3">Erforderlich</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3">svp_cookie_consent</td>
                      <td className="py-2 px-3">Speichert Cookie-Einwilligung</td>
                      <td className="py-2 px-3">1 Jahr</td>
                      <td className="py-2 px-3">Erforderlich</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3">svp_turnier_cache</td>
                      <td className="py-2 px-3">Turnierdaten-Cache für Performance</td>
                      <td className="py-2 px-3">1 Stunde</td>
                      <td className="py-2 px-3">Funktional</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3">svp_form_data</td>
                      <td className="py-2 px-3">Anmeldeformular-Zwischenspeicherung</td>
                      <td className="py-2 px-3">1 Tag</td>
                      <td className="py-2 px-3">Funktional</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3">svp_ui_preferences</td>
                      <td className="py-2 px-3">Design-Einstellungen (Hell/Dunkel)</td>
                      <td className="py-2 px-3">30 Tage</td>
                      <td className="py-2 px-3">Funktional</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-3">svp_user_settings</td>
                      <td className="py-2 px-3">Persönliche Benutzereinstellungen</td>
                      <td className="py-2 px-3">30 Tage</td>
                      <td className="py-2 px-3">Funktional</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Cookie-Einstellungen verwalten */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookie-Einstellungen verwalten</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Auf unserer Turnier-Website</h3>
                <p className="mb-4">
                  Sie können Ihre Cookie-Einstellungen jederzeit über den Button unten anpassen:
                </p>

                <div className="bg-white p-4 rounded border border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Button 
                      onClick={handleOpenCookieSettings}
                      className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Cookie-Einstellungen öffnen
                    </Button>
                    
                    {consent && (
                      <div className="text-sm text-gray-600">
                        <p><strong>Aktuelle Einstellungen:</strong></p>
                        <p>Notwendige Cookies: ✅ Aktiviert</p>
                        <p>Funktionale Cookies: {functionalAllowed ? '✅ Aktiviert' : '❌ Deaktiviert'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Letzte Änderung: {new Date(consent.timestamp).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-3 mt-6">In Ihrem Browser</h3>
                <p className="mb-4">
                  Alternativ können Sie Cookies direkt in Ihrem Browser verwalten:
                </p>
                <ul className="list-disc list-inside space-y-2 mb-6">
                  <li><strong>Chrome:</strong> Einstellungen → Datenschutz und Sicherheit → Cookies</li>
                  <li><strong>Firefox:</strong> Einstellungen → Datenschutz & Sicherheit → Cookies</li>
                  <li><strong>Safari:</strong> Einstellungen → Datenschutz → Cookies</li>
                  <li><strong>Edge:</strong> Einstellungen → Cookies und Websiteberechtigungen</li>
                </ul>
                
                <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
                  <p className="text-sm text-amber-800">
                    <strong>Hinweis:</strong> Das Deaktivieren aller Cookies kann die Funktionalität 
                    der Turnier-Website beeinträchtigen. Team-Anmeldungen benötigen mindestens die 
                    notwendigen Cookies.
                  </p>
                </div>
              </div>
            </section>

            {/* Rechtsgrundlage */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Rechtsgrundlage</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  <strong>Erforderliche Cookies:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) 
                  - notwendig für das Funktionieren der Website.
                </p>
                <p className="mb-4">
                  <strong>Funktionale Cookies:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) - 
                  nur nach Ihrer ausdrücklichen Zustimmung.
                </p>
                <p className="mb-4">
                  Sie können Ihre Einwilligung jederzeit widerrufen, ohne dass die Rechtmäßigkeit 
                  der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird.
                </p>
              </div>
            </section>

            {/* Kontakt */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Datenschutz und weitere Informationen</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="mb-4">
                  Weitere Informationen zur Datenverarbeitung finden Sie in unserer 
                  <Link href="/datenschutz" className="text-orange-600 hover:text-orange-700 mx-1">
                    Datenschutzerklärung
                  </Link>.
                </p>
                <p className="mb-4">
                  Bei Fragen zu Cookies und Datenschutz können Sie sich gerne an uns wenden:
                </p>
                <p className="mb-2">
                  <strong>Contimore UG (haftungsbeschränkt)</strong><br />
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

            {/* Kontakt */}
            <section className="mb-8">
              <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-400">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Fragen zu Cookies?</h3>
                <p className="mb-4">
                  Bei Fragen zu unserer Cookie-Verwendung oder Datenschutz wenden Sie sich gerne an uns:
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Technische Fragen (Contimore UG):</strong><br />
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
                  <p className="text-sm">
                    <strong>Turnier-Fragen (SV Puschendorf):</strong><br />
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
                <p className="text-sm text-gray-600 mt-4">
                  <strong>Unser Versprechen:</strong> Wir verwenden Cookies nur für das Nötigste 
                  und respektieren Ihre Privatsphäre. Keine versteckten Tracker oder Werbecookies!
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

      {/* Cookie Banner für Einstellungen */}
      {showCookieBanner && (
        <CookieBanner 
          onAcceptAll={() => {
            setShowCookieBanner(false);
            console.log('Alle Cookies akzeptiert');
          }}
          onRejectOptional={() => {
            setShowCookieBanner(false);
            console.log('Nur notwendige Cookies akzeptiert');
          }}
          onSettings={(consent) => {
            setShowCookieBanner(false);
            console.log('Cookie-Einstellungen gespeichert:', consent);
          }}
        />
      )}
    </div>
  );
}
