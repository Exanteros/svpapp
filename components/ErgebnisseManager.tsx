'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Calendar, 
  Clock,
  MapPin,
  Trophy, 
  Edit, 
  Save,
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

interface ErgebnisseData {
  samstag: { datum: string; zeit: string; spiele: Spiel[] };
  sonntag: { datum: string; zeit: string; spiele: Spiel[] };
  availableFields: string[];
}

export default function ErgebnisseManager() {
  const [spieleData, setSpieleData] = useState<ErgebnisseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<string>('alle');
  const [selectedStatus, setSelectedStatus] = useState<string>('alle');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'samstag' | 'sonntag'>('samstag');
  const [editingSpiel, setEditingSpiel] = useState<Spiel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toreTeam1, setToreTeam1] = useState<number>(0);
  const [toreTeam2, setToreTeam2] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSpiele();
  }, []);

  const loadSpiele = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/spielplan/get');
      if (!response.ok) {
        throw new Error('Failed to fetch spiele');
      }
      const data = await response.json();
      setSpieleData(data);
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
      loadSpiele(); // Reload data
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
        return <Badge variant="secondary">Geplant</Badge>;
      case 'laufend':
        return <Badge variant="default">Laufend</Badge>;
      case 'beendet':
        return <Badge variant="outline">Beendet</Badge>;
      default:
        return <Badge variant="secondary">Unbekannt</Badge>;
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
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Lade Spiele...</p>
      </div>
    );
  }

  if (!spieleData) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-600">Keine Spiele gefunden</p>
      </div>
    );
  }

  const filteredSamstag = filterSpiele(spieleData.samstag.spiele);
  const filteredSonntag = filterSpiele(spieleData.sonntag.spiele);

  return (
    <div className="space-y-3">
      {/* Kompakte Tabs für Samstag/Sonntag */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'samstag' | 'sonntag')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="samstag" className="text-sm">
            <span className="hidden sm:inline">Samstag</span>
            <span className="sm:hidden">Sa</span>
            <span className="ml-1">({filteredSamstag.length})</span>
          </TabsTrigger>
          <TabsTrigger value="sonntag" className="text-sm">
            <span className="hidden sm:inline">Sonntag</span>
            <span className="sm:hidden">So</span>
            <span className="ml-1">({filteredSonntag.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="samstag" className="space-y-2">
          <div className="bg-white rounded-lg border p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h3 className="font-semibold text-base sm:text-lg">{spieleData.samstag.datum}</h3>
            </div>
            
            {/* Filter Section innerhalb der weißen Box */}
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg mb-3 sm:mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Feld wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Felder</SelectItem>
                    {spieleData.availableFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Status wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Status</SelectItem>
                    <SelectItem value="geplant">Geplant</SelectItem>
                    <SelectItem value="laufend">Laufend</SelectItem>
                    <SelectItem value="beendet">Beendet</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="relative sm:col-span-2 lg:col-span-1">
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
            {filteredSamstag.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Trophy className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Keine Spiele gefunden</p>
                <p className="text-xs sm:text-sm">Passen Sie die Filter an</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {filteredSamstag.map((spiel) => (
                    <Card key={spiel.id} className="border border-slate-200">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {spiel.zeit}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              {spiel.feld}
                            </Badge>
                          </div>
                          {getStatusBadge(spiel.status)}
                        </div>
                        
                        <div className="mb-2">
                          <Badge variant="secondary" className="text-xs mb-2">
                            {spiel.kategorie}
                          </Badge>
                          <div className="font-medium text-sm">
                            {spiel.team1} vs {spiel.team2}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-gray-500">Ergebnis: </span>
                            {spiel.ergebnis ? (
                              <span className="font-bold text-green-600">{spiel.ergebnis}</span>
                            ) : (
                              <span className="text-gray-400">-:-</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(spiel)}
                            className="text-xs px-2 py-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Bearbeiten</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Zeit</TableHead>
                        <TableHead className="w-[100px]">Feld</TableHead>
                        <TableHead>Kategorie</TableHead>
                        <TableHead>Team 1</TableHead>
                        <TableHead>Team 2</TableHead>
                        <TableHead>Ergebnis</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSamstag.map((spiel) => (
                        <TableRow key={spiel.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-gray-500" />
                              {spiel.zeit}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              {spiel.feld}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{spiel.kategorie}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{spiel.team1}</TableCell>
                          <TableCell className="font-medium">{spiel.team2}</TableCell>
                          <TableCell>
                            {spiel.ergebnis ? (
                              <span className="font-bold text-green-600">{spiel.ergebnis}</span>
                            ) : (
                              <span className="text-gray-400">-:-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(spiel.status)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(spiel)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Bearbeiten
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sonntag" className="space-y-2">
          <div className="bg-white rounded-lg border p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <h3 className="font-semibold text-base sm:text-lg">{spieleData.sonntag.datum}</h3>
            </div>
            
            {/* Filter Section innerhalb der weißen Box */}
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg mb-3 sm:mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Feld wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Felder</SelectItem>
                    {spieleData.availableFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Status wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle Status</SelectItem>
                    <SelectItem value="geplant">Geplant</SelectItem>
                    <SelectItem value="laufend">Laufend</SelectItem>
                    <SelectItem value="beendet">Beendet</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="relative sm:col-span-2 lg:col-span-1">
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
            {filteredSonntag.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Trophy className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base">Keine Spiele gefunden</p>
                <p className="text-xs sm:text-sm">Passen Sie die Filter an</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {filteredSonntag.map((spiel) => (
                    <Card key={spiel.id} className="border border-slate-200">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {spiel.zeit}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              {spiel.feld}
                            </Badge>
                          </div>
                          {getStatusBadge(spiel.status)}
                        </div>
                        
                        <div className="mb-2">
                          <Badge variant="secondary" className="text-xs mb-2">
                            {spiel.kategorie}
                          </Badge>
                          <div className="font-medium text-sm">
                            {spiel.team1} vs {spiel.team2}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-gray-500">Ergebnis: </span>
                            {spiel.ergebnis ? (
                              <span className="font-bold text-green-600">{spiel.ergebnis}</span>
                            ) : (
                              <span className="text-gray-400">-:-</span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(spiel)}
                            className="text-xs px-2 py-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Bearbeiten</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Zeit</TableHead>
                        <TableHead className="w-[100px]">Feld</TableHead>
                        <TableHead>Kategorie</TableHead>
                        <TableHead>Team 1</TableHead>
                        <TableHead>Team 2</TableHead>
                        <TableHead>Ergebnis</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSonntag.map((spiel) => (
                        <TableRow key={spiel.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-gray-500" />
                              {spiel.zeit}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              {spiel.feld}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{spiel.kategorie}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{spiel.team1}</TableCell>
                          <TableCell className="font-medium">{spiel.team2}</TableCell>
                          <TableCell>
                            {spiel.ergebnis ? (
                              <span className="font-bold text-green-600">{spiel.ergebnis}</span>
                            ) : (
                              <span className="text-gray-400">-:-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(spiel.status)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(spiel)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Bearbeiten
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Ergebnis bearbeiten Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Ergebnis eingeben</DialogTitle>
            <DialogDescription>
              {editingSpiel && (
                <>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{editingSpiel.kategorie}</Badge>
                    <span className="text-sm text-gray-500">{editingSpiel.feld} • {editingSpiel.zeit}</span>
                  </div>
                  <div className="mt-2 font-medium text-sm sm:text-base">
                    {editingSpiel.team1} vs {editingSpiel.team2}
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {editingSpiel && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="tore-team1" className="text-sm">{editingSpiel.team1}</Label>
                  <Input
                    id="tore-team1"
                    type="number"
                    min="0"
                    value={toreTeam1}
                    onChange={(e) => setToreTeam1(parseInt(e.target.value) || 0)}
                    className="text-center text-lg font-bold"
                  />
                </div>
                <div>
                  <Label htmlFor="tore-team2" className="text-sm">{editingSpiel.team2}</Label>
                  <Input
                    id="tore-team2"
                    type="number"
                    min="0"
                    value={toreTeam2}
                    onChange={(e) => setToreTeam2(parseInt(e.target.value) || 0)}
                    className="text-center text-lg font-bold"
                  />
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {toreTeam1} : {toreTeam2}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSaveErgebnis} 
              disabled={updating}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
