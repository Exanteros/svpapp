import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-2 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/" className="text-green-600 hover:text-green-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ergebnisse</h1>
            <p className="text-sm text-gray-600">Aktuelle Tabellen und Resultate</p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <CardTitle className="text-lg">Ergebnisse</CardTitle>
            </div>
            <CardDescription className="text-sm">Aktuelle Spielergebnisse</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {ergebnisseData.letzteSpiele.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Noch keine Spiele beendet</p>
                <p className="text-xs">Ergebnisse werden hier angezeigt sobald Spiele beendet sind</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ergebnisseData.letzteSpiele.map((spiel, index) => (
                  <div key={spiel.id || index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">{spiel.kategorie}</Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {spiel.zeit}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{spiel.feld}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{spiel.team1}</span>
                        <span className="text-lg font-bold text-green-600">{spiel.ergebnis}</span>
                        <span className="font-medium text-sm">{spiel.team2}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">Beendet</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-600">
            Ergebnisse werden automatisch aktualisiert • Letzte Aktualisierung: {new Date().toLocaleString('de-DE')}
          </p>
        </div>
      </div>
    </div>
  );
}
