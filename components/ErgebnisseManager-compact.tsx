'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Edit,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

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
  tore_team1?: number;
  tore_team2?: number;
}

export default function ErgebnisseManagerCompact() {
  const [spieleData, setSpielenData] = useState<{
    samstag: { datum: string; zeit: string; spiele: Spiel[] };
    sonntag: { datum: string; zeit: string; spiele: Spiel[] };
    availableFields: string[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpiel, setEditingSpiel] = useState<Spiel | null>(null);
  const [toreTeam1, setToreTeam1] = useState(0);
  const [toreTeam2, setToreTeam2] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [selectedField, setSelectedField] = useState('alle');
  const [selectedStatus, setSelectedStatus] = useState('alle');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'samstag' | 'sonntag'>('samstag');

  useEffect(() => {
    loadSpiele();
  }, []);

  const loadSpiele = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/spielplan/get');
      if (!response.ok) {
        throw new Error('Failed to fetch spielplan');
      }
      const data = await response.json();
      setSpielenData(data);
    } catch (error) {
      console.error('Error loading spiele:', error);
      toast.error('Fehler beim Laden der Spiele');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (spiel: Spiel) => {
    setEditingSpiel(spiel);
    setToreTeam1(spiel.tore_team1 || 0);
    setToreTeam2(spiel.tore_team2 || 0);
    setDialogOpen(true);
  };

  const handleSaveErgebnis = async () => {
    if (!editingSpiel) return;

    try {
      setUpdating(true);
      const response = await fetch('/api/admin/ergebnisse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spielId: editingSpiel.id,
          toreTeam1,
          toreTeam2,
          status: 'beendet'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ergebnis');
      }

      toast.success('Ergebnis erfolgreich gespeichert');
      setDialogOpen(false);
      setEditingSpiel(null);
      loadSpiele();
    } catch (error) {
      console.error('Error updating ergebnis:', error);
      toast.error('Fehler beim Speichern des Ergebnisses');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'geplant':
        return <Badge variant="secondary" className="text-xs">Geplant</Badge>;
      case 'laufend':
        return <Badge variant="default" className="text-xs">Laufend</Badge>;
      case 'beendet':
        return <Badge variant="outline" className="text-xs">Beendet</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Unbekannt</Badge>;
    }
  };

  const filterSpiele = (spiele: Spiel[]) => {
    return spiele.filter(spiel => {
      const fieldMatch = selectedField === 'alle' || spiel.feld === selectedField;
      const statusMatch = selectedStatus === 'alle' || spiel.status === selectedStatus;
      const searchMatch = searchTerm === '' || 
        spiel.team1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spiel.team2.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spiel.kategorie.toLowerCase().includes(searchTerm.toLowerCase());
      
      return fieldMatch && statusMatch && searchMatch;
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Lade Spiele...</p>
      </div>
    );
  }

  if (!spieleData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Keine Spiele verfügbar</p>
      </div>
    );
  }

  const filteredSamstag = filterSpiele(spieleData.samstag.spiele);
  const filteredSonntag = filterSpiele(spieleData.sonntag.spiele);

  return (
    <div className="space-y-3">
      {/* Kompakte Filter */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={selectedField} onValueChange={setSelectedField}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Feld" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Felder</SelectItem>
              {spieleData.availableFields.map((field) => (
                <SelectItem key={field} value={field}>{field}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Status</SelectItem>
              <SelectItem value="geplant">Geplant</SelectItem>
              <SelectItem value="laufend">Laufend</SelectItem>
              <SelectItem value="beendet">Beendet</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
            <Input
              placeholder="Team suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Kompakte Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'samstag' | 'sonntag')}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="samstag" className="text-xs">Sa ({filteredSamstag.length})</TabsTrigger>
          <TabsTrigger value="sonntag" className="text-xs">So ({filteredSonntag.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="samstag" className="mt-2">
          <div className="space-y-1">
            {filteredSamstag.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Keine Spiele gefunden</p>
              </div>
            ) : (
              filteredSamstag.map((spiel) => (
                <div key={spiel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{spiel.zeit}</span>
                    <Badge variant="outline" className="text-xs">{spiel.kategorie}</Badge>
                    <span>{spiel.team1} vs {spiel.team2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {spiel.ergebnis ? (
                      <span className="font-bold text-green-600">{spiel.ergebnis}</span>
                    ) : (
                      <span className="text-gray-400">-:-</span>
                    )}
                    {getStatusBadge(spiel.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(spiel)}
                      className="h-6 px-2 text-xs"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sonntag" className="mt-2">
          <div className="space-y-1">
            {filteredSonntag.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Keine Spiele gefunden</p>
              </div>
            ) : (
              filteredSonntag.map((spiel) => (
                <div key={spiel.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{spiel.zeit}</span>
                    <Badge variant="outline" className="text-xs">{spiel.kategorie}</Badge>
                    <span>{spiel.team1} vs {spiel.team2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {spiel.ergebnis ? (
                      <span className="font-bold text-green-600">{spiel.ergebnis}</span>
                    ) : (
                      <span className="text-gray-400">-:-</span>
                    )}
                    {getStatusBadge(spiel.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(spiel)}
                      className="h-6 px-2 text-xs"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog für Ergebnis bearbeiten */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ergebnis eingeben</DialogTitle>
            <DialogDescription>
              {editingSpiel && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{editingSpiel.kategorie}</Badge>
                    <span className="text-sm text-gray-500">{editingSpiel.feld} • {editingSpiel.zeit}</span>
                  </div>
                  <div className="font-medium">
                    {editingSpiel.team1} vs {editingSpiel.team2}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tore-team1">{editingSpiel?.team1}</Label>
              <Input
                id="tore-team1"
                type="number"
                value={toreTeam1}
                onChange={(e) => setToreTeam1(parseInt(e.target.value) || 0)}
                min="0"
                max="50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tore-team2">{editingSpiel?.team2}</Label>
              <Input
                id="tore-team2"
                type="number"
                value={toreTeam2}
                onChange={(e) => setToreTeam2(parseInt(e.target.value) || 0)}
                min="0"
                max="50"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveErgebnis} disabled={updating}>
              {updating ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
