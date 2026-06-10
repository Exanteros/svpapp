'use client';

import Link from "next/link";
import { TypographyH1 } from "@/components/ui/typography";

export default function WiderrufsrechtPage() {
  return (
    <div className="bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="max-w-4xl">
          <TypographyH1 className="mb-8">Widerrufsrecht</TypographyH1>
          
          <div className="prose prose-lg max-w-none">
            {/* Einleitung */}
            <section className="mb-8">
              <div className="bg-muted/40 p-6 rounded-lg border">
                <p className="mb-4">
                  <strong>Wichtiger Hinweis:</strong> Diese Website ermöglicht die Anmeldung zum 
                  Handball-Turnier. Der Teilnahmevertrag kommt direkt zwischen Ihrem Team und dem 
                  SV Puschendorf 1949 e.V. zustande.
                </p>
                <p className="mb-4">
                  Da es sich um eine Sportveranstaltung mit festem Termin handelt und der SV Puschendorf 
                  als gemeinnütziger Verein agiert, gelten besondere Bedingungen für das Widerrufsrecht.
                </p>
                <p>
                  <strong>Stand:</strong> Juni 2026
                </p>
              </div>
            </section>

            {/* Widerrufsrecht */}
            <section className="mb-8">
              <h2 className="mb-4">Anwendbarkeit des Widerrufsrechts</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-4">
                  <strong>Website-Kontakt:</strong> Cedric Geißdörfer, Asternstraße 17, 
                  90617 Puschendorf, E-Mail:{" "}
                  <a href="mailto:support@pudo-dartmasters.de" className="text-primary hover:text-foreground">
                    support@pudo-dartmasters.de
                  </a>
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
                  finden Sie in unseren <Link href="/agb" className="text-primary hover:text-foreground">AGB</Link>.
                </p>
              </div>
            </section>

            {/* Stornierungsmöglichkeiten */}
            <section className="mb-8">
              <h2 className="mb-4">Praktische Stornierungsmöglichkeiten</h2>
              <div className="rounded-lg border bg-card p-6">
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
              <h2 className="mb-4">Kontakt für Stornierungen</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-4">
                  <strong>Für Stornierungen wenden Sie sich bitte direkt an:</strong>
                </p>
                <div className="mb-4">
                  <p className="mb-2"><strong>SV Puschendorf 1949 e.V. - Handballabteilung</strong></p>
                  <p className="mb-4">
                    E-Mail: 
                    <a href="mailto:support@pudo-dartmasters.de" className="text-primary hover:text-foreground ml-1">
                      support@pudo-dartmasters.de
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* Rechtliche Einordnung */}
            <section className="mb-8">
              <h2 className="mb-4">Rechtliche Einordnung</h2>
              <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-400">
                <p className="mb-4">
                  <strong>Warum kein klassisches Widerrufsrecht?</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Der Teilnahmevertrag wird mit dem Veranstalter des Turniers geschlossen</li>
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
              <h2 className="mb-4">Praktische Hinweise</h2>
              <div className="rounded-lg border bg-card p-6">
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
              <div className="bg-muted/40 p-6 rounded-lg border">
                <h3 className="mb-4">Fragen zu Stornierungen?</h3>
                <p className="mb-4">
                  Bei Fragen zu Stornierungen oder zur Anmeldung wenden Sie sich gerne an:
                </p>
                <p className="mb-2">
                  <strong>Turnier-Organisation:</strong><br />
                  E-Mail: 
                  <a href="mailto:support@pudo-dartmasters.de" className="text-primary hover:text-foreground ml-1">
                    support@pudo-dartmasters.de
                  </a>
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  <strong>Hinweis:</strong> Stornierungen werden in der Regel innerhalb von 2 Werktagen bearbeitet.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
