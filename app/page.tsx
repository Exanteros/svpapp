import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trophy, Users, Settings } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">SVP Rasenturnier</h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/spielplan" className="text-gray-600 hover:text-gray-900">
                Spielplan
              </Link>
              <Link href="/ergebnisse" className="text-gray-600 hover:text-gray-900">
                Ergebnisse
              </Link>
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Rasenturnier Puschendorf
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Herzlich willkommen zum Rasenturnier 2025 des SV Puschendorf
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
              <Link href="/anmeldung">Jetzt anmelden</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/spielplan">Spielplan ansehen</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Event Info Cards */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Samstag, 5. Juli 2025
              </CardTitle>
              <CardDescription>13:00 - 17:00 Uhr</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Mini-Kategorien (3, 2, 1)</li>
                <li>• E-Jugend (weiblich, gemischt, männlich)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Sonntag, 6. Juli 2025
              </CardTitle>
              <CardDescription>10:00 - 14:00 Uhr & 13:00 - 17:00 Uhr</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• D-Jugend (weiblich, männlich)</li>
                <li>• C-Jugend (weiblich, männlich)</li>
                <li>• B-Jugend (weiblich, männlich)</li>
                <li>• A-Jugend (weiblich, männlich)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold text-center mb-12">Schnellzugriff</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto text-green-600 mb-2" />
              <CardTitle>Team anmelden</CardTitle>
              <CardDescription>Registrieren Sie Ihr Team für das Turnier</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-blue-600 mb-2" />
              <CardTitle>Spielplan</CardTitle>
              <CardDescription>Aktuelle Spielpläne und Termine</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-colors cursor-pointer">
            <CardHeader className="text-center">
              <Trophy className="h-12 w-12 mx-auto text-purple-600 mb-2" />
              <CardTitle>Ergebnisse</CardTitle>
              <CardDescription>Live-Ergebnisse und Tabellen</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              © 2025 SV Puschendorf. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
