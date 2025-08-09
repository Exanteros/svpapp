import { ArrowLeft, Trophy, Medal, Target, Clock } from "lucide-react";
import Link from "next/link";

interface Spiel {
  id: string;
  datum: string;
  zeit: string;
  feld: string;
  kategorie: string;
  team1: string;
  team2: string;
  status: string;
  ergebnis?: string;
}

interface TeamStats {
  name: string;
  spiele: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  tore: string;
  punkte: number;
}

interface Gruppe {
  name: string;
  teams: TeamStats[];
}

async function getErgebnisse(): Promise<{ gruppen: Gruppe[]; letzteSpiele: Spiel[] }> {
  try {
    // Direkte Datenbankabfrage im Server-Side Rendering
    const { getDatabase } = await import('@/lib/db');
    const db = getDatabase();
    
    const spiele = db.prepare(`
      SELECT * FROM spiele 
      ORDER BY datum DESC, zeit DESC
    `).all() as Spiel[];
    
    // Nur beendete Spiele für die letzten Spiele
    const letzteSpiele = spiele.filter((spiel: Spiel) => spiel.status === 'beendet');
    
    // Tabellen berechnen (vereinfacht - wird später erweitert)
    const gruppen: Gruppe[] = [];
    
    // Hier könnte eine komplexere Tabellen-Berechnung stehen
    // Für jetzt lassen wir es leer, da noch keine Spiele existieren
    
    return {
      gruppen: gruppen,
      letzteSpiele: letzteSpiele
    };
  } catch (error) {
    console.error('Error fetching ergebnisse:', error);
    return {
      gruppen: [],
      letzteSpiele: []
    };
  }
}

export default async function ErgebnissePage() {
  const ergebnisseData = await getErgebnisse();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              {/* Handball Ball Icon */}
              <div className="relative w-8 h-8">
                <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full opacity-30"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ergebnisse</h1>
                <p className="text-sm text-gray-600">Aktuelle Tabellen und Resultate</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <h2 className="text-xl font-semibold text-gray-900">Aktuelle Ergebnisse</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Beendete Spiele und Resultate</p>
          </div>
          <div className="p-6">
            {ergebnisseData.letzteSpiele.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-orange-500 rounded-full"></div>
                    <div className="absolute top-2 left-2 w-6 h-6 bg-white rounded-full opacity-30"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Noch keine Spiele beendet</h3>
                <p className="text-gray-600">Ergebnisse werden hier angezeigt sobald Spiele beendet sind</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ergebnisseData.letzteSpiele.map((spiel, index) => (
                  <div key={spiel.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                          {spiel.kategorie}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {spiel.zeit}
                        </span>
                      </div>
                      <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                        {spiel.feld}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-900">{spiel.team1}</span>
                        <span className="text-2xl font-bold text-orange-600">{spiel.ergebnis}</span>
                        <span className="font-semibold text-gray-900">{spiel.team2}</span>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        Beendet
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Ergebnisse werden automatisch aktualisiert • Letzte Aktualisierung: {new Date().toLocaleString('de-DE')}
          </p>
        </div>
      </div>
    </div>
  );
}
