'use client';

import { TypographyH1 } from "@/components/ui/typography";

export default function ImpressumPage() {
  return (
    <div className="bg-background">
      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="max-w-4xl">
          <TypographyH1 className="mb-8">Impressum</TypographyH1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <div className="rounded-lg border bg-muted/40 p-6">
                <p className="mb-0">
                  Angaben nach § 5 DDG und Kontaktinformationen für die Turnier-Website des SV Puschendorf.
                </p>
              </div>
            </section>

            {/* Anbieter */}
            <section className="mb-8">
              <h2 className="mb-4">Anbieter</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-4">
                  <strong>Cedric Geißdörfer</strong><br />
                  Asternstraße 17<br />
                  90617 Puschendorf<br />
                  Deutschland
                </p>
              </div>
            </section>

            {/* Kontaktdaten */}
            <section className="mb-8">
              <h2 className="mb-4">Kontaktdaten des Anbieters</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-2"><strong>Cedric Geißdörfer</strong></p>
                <p className="mb-2">Asternstraße 17</p>
                <p className="mb-2">90617 Puschendorf</p>
                <p className="mb-2">Deutschland</p>
                <p className="mb-2">
                  E-Mail:{" "}
                  <a href="mailto:support@dasrasenturnier.de" className="text-primary hover:text-foreground">
                    support@dasrasenturnier.de
                  </a>
                </p>
              </div>
            </section>

            {/* Kein Registereintrag */}
            <section className="mb-8">
              <h2 className="mb-4">Registereintrag</h2>
              <div className="rounded-lg border bg-card p-6">
                <p>Es besteht kein Registereintrag.</p>
              </div>
            </section>

            {/* Kooperationspartner */}
            <section className="mb-8">
              <h2 className="mb-4">Kooperationspartner</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-2"><strong>Sportverein Puschendorf 1949 e.V.</strong></p>
                <p>Handballabteilung</p>
              </div>
            </section>

            {/* Verantwortlich für den Inhalt */}
            <section className="mb-8">
              <h2 className="mb-4">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
              <div className="rounded-lg border bg-card p-6">
                <p className="mb-2">Cedric Geißdörfer</p>
                <p className="mb-2">Asternstraße 17</p>
                <p className="mb-2">90617 Puschendorf</p>
              </div>
            </section>

            {/* Streitschlichtung */}
            <section className="mb-8">
              <h2 className="mb-4">Streitschlichtung</h2>
              <div className="rounded-lg border bg-card p-6">
                <p>
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </section>

            {/* Haftungsausschluss */}
            <section className="mb-8">
              <h2 className="mb-4">Haftungsausschluss</h2>
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <div>
                  <h3 className="mb-2">Inhalt des Onlineangebotes</h3>
                  <p>
                    Der Autor übernimmt keinerlei Gewähr für die Aktualität, Korrektheit, Vollständigkeit 
                    oder Qualität der bereitgestellten Informationen. Haftungsansprüche gegen den Autor, 
                    welche sich auf Schäden materieller oder ideeller Art beziehen, die durch die Nutzung 
                    oder Nichtnutzung der dargebotenen Informationen bzw. durch die Nutzung fehlerhafter 
                    und unvollständiger Informationen verursacht wurden, sind grundsätzlich ausgeschlossen.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2">Verweise und Links</h3>
                  <p>
                    Bei direkten oder indirekten Verweisen auf fremde Internetseiten ("Links"), die außerhalb 
                    des Verantwortungsbereiches des Autors liegen, würde eine Haftungsverpflichtung ausschließlich 
                    in dem Fall in Kraft treten, in dem der Autor von den Inhalten Kenntnis hat und es ihm 
                    technisch möglich und zumutbar wäre, die Nutzung im Falle rechtswidriger Inhalte zu verhindern.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2">Urheberrecht</h3>
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
              <h2 className="mb-4">Rechtswirksamkeit des Disclaimers</h2>
              <div className="rounded-lg border bg-card p-6">
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
              <div className="bg-muted/40 p-6 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  <strong>Hinweis:</strong> Stand: Juni 2026. Dieses Impressum wird regelmäßig überprüft 
                  und bei Bedarf aktualisiert.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
