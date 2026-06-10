'use client';

import { TypographyH1 } from "@/components/ui/typography";

export default function DatenschutzPage() {
  return (
    <div className="bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="max-w-4xl">
          <TypographyH1 className="mb-8">Datenschutzerklärung</TypographyH1>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <div className="rounded-lg border bg-muted/40 p-6">
                <p className="mb-4">
                  Diese Datenschutzerklärung beschreibt, wie personenbezogene Daten für Anmeldung,
                  Turnierbetrieb, Helferkoordination, Schiedsrichterkarten, PWA-Funktionen und Support
                  verarbeitet werden.
                </p>
                <p>
                  <strong>Stand:</strong> Juni 2026
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">1. Verantwortlicher</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-4">
                  Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
                </p>
                <p className="mb-2"><strong>Cedric Geißdörfer</strong></p>
                <p className="mb-2">Asternstraße 17</p>
                <p className="mb-2">90617 Puschendorf</p>
                <p className="mb-2">Deutschland</p>
                <p className="mb-0">
                  E-Mail:{" "}
                  <a href="mailto:support@dasrasenturnier.de" className="text-primary hover:text-foreground">
                    support@dasrasenturnier.de
                  </a>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">2. Hosting, Server-Logs und E-Mail-Versand</h2>
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <p>
                  Die technische Bereitstellung erfolgt über Serverinfrastruktur in Deutschland bzw. der EU,
                  insbesondere T Cloud Public. Für Hosting und technischen Betrieb bestehen, soweit erforderlich,
                  Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO.
                </p>
                <p>
                  Beim Aufruf der Website werden technisch notwendige Server-Log-Dateien verarbeitet. Dazu
                  können IP-Adresse, Datum und Uhrzeit, aufgerufene URL, Referrer, Browsertyp, Betriebssystem
                  und technische Statusinformationen gehören.
                </p>
                <p>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse
                  liegt im sicheren, stabilen und missbrauchsgeschützten Betrieb der Website.
                </p>
                <p>
                  Für organisatorische Nachrichten, insbesondere Bestätigungen zur Anmeldung und interne
                  Admin-Benachrichtigungen, kann ein SMTP-/E-Mail-Dienst eingesetzt werden. Dabei werden die
                  für die jeweilige Nachricht erforderlichen Kontakt- und Turnierdaten verarbeitet.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">3. Team-Anmeldung und Turnierbetrieb</h2>
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <p>
                  Bei einer Team-Anmeldung verarbeiten wir Daten, die für Organisation und Durchführung des
                  Handball-Turniers erforderlich sind.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Verein, Kontaktperson, E-Mail-Adresse und Mobilnummer</li>
                  <li>angemeldete Kategorien, Anzahl der Teams, Spielstärke und Schiedsrichterangaben</li>
                  <li>Kosten, Zahlungsstatus und organisatorische Statusangaben</li>
                  <li>Spielplan-, Begegnungs-, Feld- und Ergebnisdaten</li>
                </ul>
                <p>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO für Anmeldung und Durchführung
                  des Turniers sowie Art. 6 Abs. 1 lit. f DSGVO für effiziente Organisation, Nachbereitung und
                  Missbrauchsschutz.
                </p>
                <p>
                  Empfänger können die Turnierleitung, berechtigte Admins und der Sportverein Puschendorf
                  1949 e.V. sein, soweit dies für den Turnierbetrieb erforderlich ist.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">4. Helferkoordination</h2>
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <p>
                  Für Helferlisten verarbeiten wir Name, E-Mail-Adresse, Telefonnummer, ausgewählte Aufgabe,
                  Zeitfenster sowie freiwillige Angaben wie Bemerkungen oder Kuchenspende.
                </p>
                <p>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO für die Anmeldung zu einer
                  Helferaufgabe und Art. 6 Abs. 1 lit. f DSGVO für die Planung und Besetzung der Turnierdienste.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">5. Schiedsrichterkarten, QR-Codes und Kamera</h2>
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <p>
                  Schiedsrichterkarten enthalten spielbezogene QR-/Karten-Codes. Beim Scannen wird der Code
                  genutzt, um das zugehörige Spiel zu öffnen und Ergebnisse einzutragen.
                </p>
                <p>
                  Der Kamera-Zugriff erfolgt nur nach aktiver Freigabe im Browser. Das Kamerabild wird zur
                  Erkennung des Karten-Codes im Browser verarbeitet. Gespeichert werden nur die daraus
                  übernommenen Ergebnisdaten.
                </p>
                <p>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse
                  liegt in einer schnellen und fehlerarmen Ergebniserfassung am Turniertag.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">6. Cookies, Local Storage und PWA</h2>
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <p>
                  Die Website nutzt technisch notwendige Cookies und lokale Speichertechnologien für Login,
                  Sicherheit, Cookie-Einstellungen, PWA-Funktionalität und eine stabile Bedienung.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Session-Cookies für Admin-Login und Zugriffsschutz</li>
                  <li>Local Storage für Admin-Token, Cookie-Präferenzen und optionale UI-/Cache-Daten</li>
                  <li>Service Worker und Cache Storage für PWA- und Offline-Funktionen</li>
                </ul>
                <p>
                  <strong>Rechtsgrundlage:</strong> Für technisch erforderliche Speicherung Art. 6 Abs. 1
                  lit. f DSGVO sowie § 25 Abs. 2 TDDDG. Optionale funktionale Speicherung erfolgt nur nach
                  Einwilligung, Art. 6 Abs. 1 lit. a DSGVO.
                </p>
                <p>
                  Tracking-, Werbe- oder Profiling-Cookies werden nicht eingesetzt.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">7. Speicherdauer und Löschung</h2>
              <div className="rounded-lg border bg-card p-6">
                <ul className="space-y-3">
                  <li>
                    <strong>Server-Logs:</strong> werden grundsätzlich nur so lange gespeichert, wie es für
                    Sicherheit und Fehleranalyse erforderlich ist.
                  </li>
                  <li>
                    <strong>Anmeldungen, Helferdaten und organisatorische Turnierdaten:</strong> werden
                    spätestens 24 Monate nach Abschluss des Turniers gelöscht, soweit keine längeren
                    gesetzlichen Aufbewahrungsfristen greifen.
                  </li>
                  <li>
                    <strong>Abrechnungs- oder zahlungsrelevante Unterlagen:</strong> können nach gesetzlichen
                    Vorgaben bis zu 10 Jahre aufbewahrt werden.
                  </li>
                  <li>
                    <strong>Admin-Sitzungen und lokale Browserdaten:</strong> können durch Logout bzw. über
                    Browser- und Cookie-Einstellungen gelöscht werden.
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">8. Rechte betroffener Personen</h2>
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <p>Sie haben nach der DSGVO insbesondere folgende Rechte:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Auskunft über verarbeitete Daten (Art. 15 DSGVO)</li>
                  <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
                  <li>Löschung (Art. 17 DSGVO)</li>
                  <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                  <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO)</li>
                  <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
                </ul>
                <p>
                  Für Datenschutzanliegen genügt eine formlose E-Mail an{" "}
                  <a href="mailto:support@pudo-dartmasters.de" className="text-primary hover:text-foreground">
                    support@pudo-dartmasters.de
                  </a>.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">9. Beschwerderecht</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-4">
                  Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
                </p>
                <p className="mb-0">
                  Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)<br />
                  Promenade 18<br />
                  91522 Ansbach<br />
                  Website:{" "}
                  <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-foreground">
                    www.lda.bayern.de
                  </a>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="mb-4">10. Keine automatisierte Entscheidungsfindung</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-0">
                  Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO
                  findet nicht statt.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
