'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Toaster } from '@/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import ErgebnisseManager from '@/components/ErgebnisseManager'
import LiveGamesDashboard from '@/components/LiveGamesDashboard'
import EmailManager from '@/components/EmailManager'
import TeamEmailPopup from '@/components/TeamEmailPopup'
import { exportAnmeldungenCSV, exportStatistikenCSV } from '@/lib/export-utils'
import {
  exportSimpleSpielplanPDF,
  exportSpielplanCSV,
  previewSpielplanPDF
} from '@/lib/pdf-export-simple'
import {
  helferApi,
  spielplanApi,
  handleApiError
} from '@/lib/api-client'
import {
  ArrowLeft,
  Users,
  Calendar as CalendarIcon,
  Settings,
  Mail,
  Eye,
  RefreshCw,
  Trophy,
  Shield,
  Clock,
  Euro,
  MapPin,
  Save,
  Download,
  Upload,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Edit,
  X,
  LogOut,
  RotateCcw
} from 'lucide-react'

interface Team {
  id: string
  kategorie: string
  anzahl: number
  schiri: boolean
  spielstaerke?: string
}

interface Anmeldung {
  id: string
  verein: string
  kontakt: string
  email: string
  mobil: string
  kosten: number
  status: string
  created_at: string
  teams: Team[]
}

interface Spiel {
  id: string
  datum: string
  zeit: string
  feld: string
  kategorie: string
  team1: string
  team2: string
  status: string
  ergebnis?: string
}

interface FeldEinstellungen {
  id: string
  name: string
  spielzeit: number
  pausenzeit: number
  halbzeitpause: number
  zweiHalbzeiten: boolean
  erlaubteJahrgaenge: string[]
  // Pro Tag separate Jahrgang-Einstellungen
  erlaubteJahrgaengeProTag: {
    [datum: string]: string[]
  }
}

interface Statistiken {
  anmeldungen: number
  teams: number
  bezahlt: number
  gesamtKosten: number
  kategorien: { [key: string]: number }
  fieldsUsed: number
}

interface TurnierEinstellungen {
  turnierName: string
  startgeld: number
  schiriGeld: number
  maxTeamsProKategorie: number
  anmeldeschluss: string
  anzahlFelder: number
  adminEmail: string
  automatischeEmails: boolean
  sichtbarkeit: 'public' | 'private'
  zahlungsarten: string[]
  datenschutz: boolean
  turnierStartDatum: string
  turnierEndDatum: string
  // Neue Zeiteinstellungen
  samstagStartzeit: string
  samstagEndzeit: string
  sonntagStartzeit: string
  sonntagEndzeit: string
}

interface HelferBedarf {
  id: string
  titel: string
  beschreibung: string
  datum: string
  startzeit: string
  endzeit: string
  anzahlBenötigt: number
  kategorie:
    | 'getraenke'
    | 'kaffee_kuchen'
    | 'grill'
    | 'waffeln_suess'
    | 'aufbau'
    | 'sonstiges'
  aktiv: boolean
  created_at: string
}

interface HelferAnmeldung {
  id: string
  helferBedarfId: string
  name: string
  email: string
  telefon?: string
  bemerkung?: string
  kuchenspende?: string
  status: 'angemeldet' | 'bestätigt' | 'abgesagt'
  created_at: string
}

export default function AdminPage () {
  const router = useRouter()

  // Verfügbare Jahrgänge basierend auf den Anmeldekategorien
  const VERFÜGBARE_JAHRGÄNGE = [
    'Mini',
    'E-Jugend',
    'D-Jugend weiblich',
    'D-Jugend männlich',
    'C-Jugend weiblich',
    'C-Jugend männlich',
    'B-Jugend weiblich',
    'B-Jugend männlich',
    'A-Jugend weiblich',
    'A-Jugend männlich'
  ]

  // Check authentication on component mount
  useEffect(() => {
    console.log('🔍 Admin-Seite: Authentifizierung prüfen...')

    // Check if session exists by making a test API call
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin'
        })

        if (!response.ok) {
          console.log('❌ Nicht authentifiziert - Weiterleitung zur Login-Seite')
          router.replace('/admin/login')
          return
        }

        console.log('✅ Authentifiziert - Admin-Seite wird geladen')
        // Don't call loadAdminData here since the response already contains the data
        const data = await response.json()
        console.log('Admin data loaded:', data)

        setAnmeldungen(data.anmeldungen || [])
        setStatistiken(
          data.statistiken || {
            anmeldungen: 0,
            teams: 0,
            bezahlt: 0,
            gesamtKosten: 0,
            kategorien: {},
            fieldsUsed: 0
          }
        )
        if (data.settings) {
          setTurnierEinstellungen(data.settings)
        }

        // Load field settings
        await loadFeldEinstellungen()
        
        // Load Spielplan data on authentication success
        await loadSpielplan()
        await loadHelferData()
      } catch (error) {
        console.error('❌ Fehler bei Authentifizierung:', error)
        router.replace('/admin/login')
      }
    }

    checkAuth()
  }, [router])

  const [anmeldungen, setAnmeldungen] = useState<Anmeldung[]>([])

  const [statistiken, setStatistiken] = useState<Statistiken>({
    anmeldungen: 0,
    teams: 0,
    bezahlt: 0,
    gesamtKosten: 0,
    kategorien: {},
    fieldsUsed: 0
  })

  const [turnierEinstellungen, setTurnierEinstellungen] =
    useState<TurnierEinstellungen>({
      turnierName: 'Rasenturnier Puschendorf 2025',
      startgeld: 25,
      schiriGeld: 20,
      maxTeamsProKategorie: 8,
      anmeldeschluss: '2025-06-30',
      anzahlFelder: 5,
      adminEmail: 'admin@sv-puschendorf.de',
      automatischeEmails: true,
      sichtbarkeit: 'public',
      zahlungsarten: ['Überweisung', 'PayPal', 'Barzahlung'],
      datenschutz: true,
      turnierStartDatum: '2025-07-05',
      turnierEndDatum: '2025-07-06',
      // Standard-Zeiten
      samstagStartzeit: '09:00',
      samstagEndzeit: '18:00',
      sonntagStartzeit: '09:00',
      sonntagEndzeit: '18:00'
    })

  const [loading, setLoading] = useState(false)
  const [selectedAnmeldung, setSelectedAnmeldung] = useState<string | null>(
    null
  )
  const [saving, setSaving] = useState(false)
  const [spiele, setSpiele] = useState<Spiel[]>([])

  // Funktion um Wochentage basierend auf dem Turnierdatum zu berechnen
  const getTurnierWochentage = () => {
    const startDate = new Date(
      turnierEinstellungen.turnierStartDatum || '2025-07-05'
    )
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 1) // Nächster Tag

    const dayNames = [
      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag'
    ]

    return {
      tag1: dayNames[startDate.getDay()],
      tag2: dayNames[endDate.getDay()]
    }
  }

  const { tag1, tag2 } = getTurnierWochentage()

  const [feldEinstellungen, setFeldEinstellungen] = useState<
    FeldEinstellungen[]
  >([
    {
      id: 'feld1',
      name: 'Feld 1',
      spielzeit: 10,
      pausenzeit: 2,
      halbzeitpause: 0,
      zweiHalbzeiten: false,
      erlaubteJahrgaenge: [],
      erlaubteJahrgaengeProTag: {}
    },
    {
      id: 'feld2',
      name: 'Feld 2',
      spielzeit: 12,
      pausenzeit: 3,
      halbzeitpause: 0,
      zweiHalbzeiten: false,
      erlaubteJahrgaenge: [],
      erlaubteJahrgaengeProTag: {}
    },
    {
      id: 'feld3',
      name: 'Feld 3',
      spielzeit: 15,
      pausenzeit: 2,
      halbzeitpause: 0,
      zweiHalbzeiten: false,
      erlaubteJahrgaenge: [],
      erlaubteJahrgaengeProTag: {}
    },
    {
      id: 'feld4',
      name: 'Feld 4',
      spielzeit: 8,
      pausenzeit: 2,
      halbzeitpause: 2,
      zweiHalbzeiten: true,
      erlaubteJahrgaenge: [],
      erlaubteJahrgaengeProTag: {}
    },
    {
      id: 'feld5',
      name: 'Beachfeld',
      spielzeit: 12,
      pausenzeit: 3,
      halbzeitpause: 0,
      zweiHalbzeiten: false,
      erlaubteJahrgaenge: [],
      erlaubteJahrgaengeProTag: {}
    }
  ])
  const [draggedSpiel, setDraggedSpiel] = useState<Spiel | null>(null)
  const [selectedSpiel, setSelectedSpiel] = useState<Spiel | null>(null)
  const [editingSpiel, setEditingSpiel] = useState<Spiel | null>(null)
  const [showSpielDialog, setShowSpielDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('2025-07-05') // Default-Wert statt Abhängigkeit von turnierEinstellungen

  // Helfer-Management States
  const [helferBedarf, setHelferBedarf] = useState<HelferBedarf[]>([])
  const [helferAnmeldungen, setHelferAnmeldungen] = useState<HelferAnmeldung[]>(
    []
  )
  const [helferLink, setHelferLink] = useState<string>('')
  const [editingHelferBedarf, setEditingHelferBedarf] =
    useState<HelferBedarf | null>(null)
  const [showHelferDialog, setShowHelferDialog] = useState(false)
  const [draggedHelferBedarf, setDraggedHelferBedarf] =
    useState<HelferBedarf | null>(null)
  const [selectedHelferBedarf, setSelectedHelferBedarf] =
    useState<HelferBedarf | null>(null)
  const [showHelferDetails, setShowHelferDetails] = useState(false)
  const [helferDetailsAnmeldungen, setHelferDetailsAnmeldungen] = useState<
    HelferAnmeldung[]
  >([])
  const [showHelferDebugDialog, setShowHelferDebugDialog] = useState(false)
  const [helferDebugAction, setHelferDebugAction] = useState<
    'flush' | 'demo' | null
  >(null)
  const [showAnmeldungenDebugDialog, setShowAnmeldungenDebugDialog] =
    useState(false)
  const [anmeldungenDebugAction, setAnmeldungenDebugAction] = useState<
    'flush' | 'demo' | null
  >(null)

  // API-Funktionen
  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      // Direct fetch to /api/admin instead of using old api-client
      const response = await fetch('/api/admin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Admin data loaded:', data)

      setAnmeldungen(data.anmeldungen || [])
      setStatistiken(
        data.statistiken || {
          anmeldungen: 0,
          teams: 0,
          bezahlt: 0,
          gesamtKosten: 0,
          kategorien: {},
          fieldsUsed: 0
        }
      )
      if (data.settings) {
        setTurnierEinstellungen(data.settings)
      }

      // Load field settings
      await loadFeldEinstellungen()
    } catch (error: any) {
      console.error('Fehler beim Laden der Admin-Daten:', error)
      alert(`Fehler beim Laden der Daten: ${error?.message || 'Unbekannter Fehler'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadFeldEinstellungen = async () => {
    try {
      const response = await fetch('/api/admin/feld-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.feldEinstellungen) {
          // Stelle sicher, dass erlaubteJahrgaengeProTag existiert
          const updatedFeldEinstellungen = data.feldEinstellungen.map(
            (feld: FeldEinstellungen) => ({
              ...feld,
              erlaubteJahrgaengeProTag: feld.erlaubteJahrgaengeProTag || {}
            })
          )
          setFeldEinstellungen(updatedFeldEinstellungen)
          console.log(
            '✅ Feldeinstellungen geladen:',
            data.feldEinstellungen.length
          )
        }
      }
    } catch (error) {
      console.warn('⚠️ Feldeinstellungen konnten nicht geladen werden:', error)
    }
  }

  const resetFeldEinstellungen = async () => {
    const confirmed = confirm(
      '⚠️ Möchten Sie die Feldeinstellungen auf die Standard-Konfiguration zurücksetzen?\n\nDies stellt folgende Felder wieder her:\n- Feld 1\n- Feld 2\n- Feld 3\n- Feld 4\n- Beachfeld'
    )

    if (!confirmed) return

    try {
      setLoading(true)
      
      const defaultFeldEinstellungen = [
        {
          id: 'feld1',
          name: 'Feld 1',
          spielzeit: 10,
          pausenzeit: 2,
          halbzeitpause: 0,
          zweiHalbzeiten: false,
          erlaubteJahrgaenge: [],
          erlaubteJahrgaengeProTag: {}
        },
        {
          id: 'feld2',
          name: 'Feld 2',
          spielzeit: 12,
          pausenzeit: 3,
          halbzeitpause: 0,
          zweiHalbzeiten: false,
          erlaubteJahrgaenge: [],
          erlaubteJahrgaengeProTag: {}
        },
        {
          id: 'feld3',
          name: 'Feld 3',
          spielzeit: 15,
          pausenzeit: 2,
          halbzeitpause: 0,
          zweiHalbzeiten: false,
          erlaubteJahrgaenge: [],
          erlaubteJahrgaengeProTag: {}
        },
        {
          id: 'feld4',
          name: 'Feld 4',
          spielzeit: 8,
          pausenzeit: 2,
          halbzeitpause: 2,
          zweiHalbzeiten: true,
          erlaubteJahrgaenge: [],
          erlaubteJahrgaengeProTag: {}
        },
        {
          id: 'feld5',
          name: 'Beachfeld',
          spielzeit: 12,
          pausenzeit: 3,
          halbzeitpause: 0,
          zweiHalbzeiten: false,
          erlaubteJahrgaenge: [],
          erlaubteJahrgaengeProTag: {}
        }
      ]

      const response = await fetch('/api/admin/feld-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feldEinstellungen: defaultFeldEinstellungen })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setFeldEinstellungen(defaultFeldEinstellungen)
          alert('✅ Feldeinstellungen wurden erfolgreich zurückgesetzt!')
          console.log('✅ Feldeinstellungen zurückgesetzt:', defaultFeldEinstellungen)
        } else {
          throw new Error(data.message || 'Fehler beim Zurücksetzen')
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Fehler beim Zurücksetzen der Feldeinstellungen:', error)
      alert(`❌ Fehler beim Zurücksetzen der Feldeinstellungen: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteAllSpiele = async () => {
    const confirmed = confirm(
      '⚠️ Möchten Sie wirklich ALLE Spiele aus dem Spielplan löschen? Diese Aktion kann nicht rückgängig gemacht werden!'
    )

    if (!confirmed) return

    try {
      setLoading(true)

      // Verwende spielplanApi.deleteAllSpiele
      const data = await spielplanApi.deleteAllSpiele()

      // Lokale Aktualisierung
      setSpiele([])
      alert(
        `✅ Alle Spiele wurden erfolgreich gelöscht! (${
          data.result?.deleted || 0
        } Einträge entfernt)`
      )
    } catch (error) {
      console.error('Fehler beim Löschen aller Spiele:', error)
      const errorMessage = handleApiError(error as Error)
      alert(`❌ Fehler beim Löschen aller Spiele: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const loadSpielplan = async () => {
    try {
      console.log('🎮 Loading Spielplan...')
      const data = await spielplanApi.getSpielplan()
      console.log('📊 Spielplan API Response:', data)
      const spiele = data.spiele || []
      console.log('🎯 Spielplan Spiele:', spiele.length, spiele)
      setSpiele(spiele)
      console.log('✅ Spiele erfolgreich gesetzt!')
    } catch (error) {
      console.error('Fehler beim Laden des Spielplans:', error)
      const errorMessage = handleApiError(error as Error)
      alert(`Fehler beim Laden des Spielplans: ${errorMessage}`)
    }
  }

  const loadHelferData = async () => {
    try {
      const data = await helferApi.getHelferData()
      setHelferBedarf(data.bedarf || [])
      setHelferAnmeldungen(data.anmeldungen || [])
      setHelferLink(data.helferLink || '')
    } catch (error) {
      console.error('Fehler beim Laden der Helfer-Daten:', error)
      const errorMessage = handleApiError(error as Error)
      alert(`Fehler beim Laden der Helfer-Daten: ${errorMessage}`)
    }
  }

  const refreshData = async () => {
    await loadAdminData()
    await loadSpielplan()
    await loadHelferData()
  }

  // useEffect für initiales Laden
  useEffect(() => {
    // Authentication is already checked in the main useEffect, no need to duplicate loading
    console.log('Secondary useEffect - skipping duplicate data loading')
  }, [])

  // useEffect um selectedDate zu aktualisieren, wenn turnierEinstellungen geladen werden
  useEffect(() => {
    if (
      turnierEinstellungen.turnierStartDatum &&
      turnierEinstellungen.turnierStartDatum !== '2025-07-05'
    ) {
      setSelectedDate(turnierEinstellungen.turnierStartDatum)
    }
  }, [turnierEinstellungen.turnierStartDatum])

  const updateAnmeldungStatus = async (
    anmeldungId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'update_status',
          anmeldungId,
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Status update response:', data)

      setAnmeldungen(prev =>
        prev.map(anmeldung =>
          anmeldung.id === anmeldungId
            ? { ...anmeldung, status: newStatus }
            : anmeldung
        )
      )

      // Statistiken aktualisieren
      await refreshData()
      alert('Status erfolgreich aktualisiert!')
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren des Status:', error)
      alert(`Fehler beim Aktualisieren des Status: ${error?.message || 'Unbekannter Fehler'}`)
    }
  }

  const deleteAnmeldung = async (anmeldungId: string, verein: string) => {
    const confirmed = confirm(
      `Möchten Sie die Anmeldung von "${verein}" wirklich unwiderruflich löschen?`
    )

    if (!confirmed) return

    try {
      const response = await fetch('/api/admin', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deleteAnmeldung', anmeldungId }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setAnmeldungen(prev =>
        prev.filter(anmeldung => anmeldung.id !== anmeldungId)
      )

      // Statistiken aktualisieren
      await refreshData()
      alert('Anmeldung erfolgreich gelöscht!')
    } catch (error) {
      console.error('Fehler beim Löschen der Anmeldung:', error)
      const errorMessage = handleApiError(error as Error)
      alert(`Fehler beim Löschen der Anmeldung: ${errorMessage}`)
    }
  }

  const saveHelferBedarf = async (
    bedarf: Omit<HelferBedarf, 'id' | 'created_at'>
  ) => {
    try {
      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save_bedarf',
          bedarf: bedarf
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern des Helfer-Bedarfs')
      }

      await loadHelferData()
      alert('Helfer-Bedarf erfolgreich gespeichert!')
    } catch (error) {
      console.error('Fehler beim Speichern des Helfer-Bedarf:', error)
      alert('Fehler beim Speichern des Helfer-Bedarf')
    }
  }

  const deleteHelferBedarf = async (bedarfId: string) => {
    if (
      !confirm(
        'Sind Sie sicher, dass Sie diesen Helfer-Bedarf löschen möchten?'
      )
    ) {
      return
    }

    try {
      console.log('Deleting Helfer-Bedarf with ID:', bedarfId);
      
      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete_bedarf',
          bedarfId: bedarfId
        })
      })

      const result = await response.json();
      console.log('Delete response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Löschen des Helfer-Bedarfs')
      }

      if (result.deleted === false) {
        alert('Helfer-Bedarf konnte nicht gelöscht werden (möglicherweise bereits gelöscht)');
        return;
      }

      await loadHelferData()
      alert('Helfer-Bedarf erfolgreich gelöscht!')
    } catch (error) {
      console.error('Fehler beim Löschen des Helfer-Bedarf:', error)
      alert(`Fehler beim Löschen des Helfer-Bedarf: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  const generateHelferLink = async () => {
    try {
      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'generate_link'
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Generieren des Helfer-Links')
      }

      const data = await response.json()
      setHelferLink(data.helferLink)
      alert('Helfer-Link erfolgreich generiert!')
    } catch (error) {
      console.error('Fehler beim Generieren des Helfer-Links:', error)
      alert('Fehler beim Generieren des Helfer-Links')
    }
  }

  const updateHelferStatus = async (anmeldungId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_status',
          anmeldungId,
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren des Helfer-Status')
      }

      await loadHelferData()
      alert('Status erfolgreich aktualisiert!')
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Helfer-Status:', error)
      alert('Fehler beim Aktualisieren des Helfer-Status')
    }
  }

  const deleteHelferAnmeldung = async (anmeldungId: string) => {
    if (!confirm('Möchten Sie diese Helfer-Anmeldung wirklich löschen?')) {
      return
    }

    try {
      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete_anmeldung',
          anmeldungId
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen der Helfer-Anmeldung')
      }

      await loadHelferData()
      alert('Anmeldung erfolgreich gelöscht!')
    } catch (error) {
      console.error('Fehler beim Löschen der Helfer-Anmeldung:', error)
      alert('Fehler beim Löschen der Helfer-Anmeldung')
    }
  }

  const flushHelferDatabase = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'flush_database'
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Leeren der Helfer-Datenbank')
      }

      const data = await response.json()
      await loadHelferData()
      setShowHelferDebugDialog(false)
      setHelferDebugAction(null)
      alert(
        `✅ Helfer-Datenbank erfolgreich geleert! (${
          data.result?.anmeldungen || 0
        } Anmeldungen, ${data.result?.bedarf || 0} Bedarfseinträge entfernt)`
      )
    } catch (error) {
      console.error('Fehler beim Leeren der Helfer-Datenbank:', error)
      alert('Fehler beim Leeren der Helfer-Datenbank')
    } finally {
      setLoading(false)
    }
  }

  const createHelferDemoData = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_demo_data'
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Demo-Daten')
      }

      const data = await response.json()
      await loadHelferData()
      setShowHelferDebugDialog(false)
      setHelferDebugAction(null)
      alert(
        `✅ Demo-Daten erfolgreich erstellt! (${
          data.result?.bedarf || 0
        } Bedarfseinträge, ${data.result?.anmeldungen || 0} Anmeldungen)`
      )
    } catch (error) {
      console.error('Fehler beim Erstellen der Demo-Daten:', error)
      alert('Fehler beim Erstellen der Demo-Daten')
    } finally {
      setLoading(false)
    }
  }

  const handleHelferDebugAction = () => {
    if (helferDebugAction === 'flush') {
      flushHelferDatabase()
    } else if (helferDebugAction === 'demo') {
      createHelferDemoData()
    }
  }

  const flushAnmeldungenDatabase = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'flush_anmeldungen_database'
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Leeren der Anmeldungen-Datenbank')
      }

      const data = await response.json()
      await refreshData()
      setShowAnmeldungenDebugDialog(false)
      setAnmeldungenDebugAction(null)
      alert(
        `✅ Anmeldungen-Datenbank erfolgreich geleert! (${
          data.result?.anmeldungen || 0
        } Anmeldungen, ${data.result?.teams || 0} Teams entfernt)`
      )
    } catch (error) {
      console.error('Fehler beim Leeren der Anmeldungen-Datenbank:', error)
      alert('Fehler beim Leeren der Anmeldungen-Datenbank')
    } finally {
      setLoading(false)
    }
  }

  const createAnmeldungenDemoData = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_anmeldungen_demo_data'
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Anmeldungen Demo-Daten')
      }

      const data = await response.json()
      await refreshData()
      setShowAnmeldungenDebugDialog(false)
      setAnmeldungenDebugAction(null)
      alert(
        `✅ Anmeldungen Demo-Daten erfolgreich erstellt! (${
          data.result?.anmeldungen || 0
        } Anmeldungen, ${data.result?.totalTeams || 0} Teams)`
      )
    } catch (error) {
      console.error('Fehler beim Erstellen der Anmeldungen Demo-Daten:', error)
      alert('Fehler beim Erstellen der Anmeldungen Demo-Daten')
    } finally {
      setLoading(false)
    }
  }

  const handleAnmeldungenDebugAction = () => {
    if (anmeldungenDebugAction === 'flush') {
      flushAnmeldungenDatabase()
    } else if (anmeldungenDebugAction === 'demo') {
      createAnmeldungenDemoData()
    }
  }

  const generateSpielplan = async () => {
    try {
      console.log(
        '🎯 Spielplan-Generierung mit spielplanApi.generateSpielplan...'
      )
      console.log('📅 Aktuell selectedDate:', selectedDate)
      console.log('🏆 Turnier-Einstellungen:', {
        startDatum: turnierEinstellungen.turnierStartDatum,
        endDatum: turnierEinstellungen.turnierEndDatum
      })
      console.log(
        '🏟️ Feld-Beschränkungen:',
        feldEinstellungen.map(f => ({
          feld: f.name,
          erlaubteJahrgaenge:
            f.erlaubteJahrgaenge.length > 0 ? f.erlaubteJahrgaenge : 'Alle',
          erlaubteJahrgaengeProTag: f.erlaubteJahrgaengeProTag || 'Keine'
        }))
      )

      console.log('🎯 Detaillierte Feld-Einstellungen vor Generierung:')
      feldEinstellungen.forEach(feld => {
        console.log(`📋 Feld ${feld.name} (ID: ${feld.id}):`)
        console.log(`  - Standard-Jahrgänge:`, feld.erlaubteJahrgaenge)
        console.log(`  - Tag-spezifische Jahrgänge:`, feld.erlaubteJahrgaengeProTag)
      })

      // Überprüfe die Anmeldungsdaten vor der Generierung
      console.log(`📋 Anmeldungen verfügbar: ${anmeldungen.length}`)
      anmeldungen.forEach(anm => {
        console.log(`🏢 Anmeldung ${anm.verein} mit ${anm.teams.length} Teams:`)
        anm.teams.forEach(team => {
          console.log(`  - ${team.kategorie}: ${team.anzahl} Teams`)
        })
      })

      const data = await spielplanApi.generateSpielplan(
        turnierEinstellungen,
        feldEinstellungen
      )
      const spiele = data.spiele || []
      console.log('🎮 Erhaltene Spiele:', spiele.length)

      if (spiele.length > 0) {
        console.log('📋 Erstes Spiel:', spiele[0])
        console.log(
          '⚙️ Feld-Einstellungen:',
          feldEinstellungen.map(f => f.name)
        )

        // Zeige alle Spiele mit ihren Daten
        const spieleMitDaten = spiele.map((s: Spiel) => ({
          id: s.id,
          datum: s.datum,
          zeit: s.zeit,
          feld: s.feld,
          team1: s.team1,
          team2: s.team2
        }))
        console.log('📊 Alle Spiele:', spieleMitDaten)

        // Setze selectedDate auf das Datum des ersten Spiels
        const firstGameDate = spiele[0].datum
        console.log(
          '📅 Setze selectedDate auf erstes Spiel-Datum:',
          firstGameDate
        )
        setSelectedDate(firstGameDate)
      } else {
        console.warn(
          '⚠️ Keine Spiele generiert! Überprüfe die Anmeldungen und Teams.'
        )
      }

      setSpiele(spiele)
      alert(
        `Spielplan erfolgreich generiert! ${spiele.length} Spiele erstellt.`
      )
    } catch (error) {
      console.error('Fehler beim Generieren des Spielplans:', error)
      alert('Fehler beim Generieren des Spielplans')
    }
  }

  // Drag & Drop Funktionen
  const handleDragStart = (e: React.DragEvent, spiel: Spiel) => {
    setDraggedSpiel(spiel)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (
    e: React.DragEvent,
    targetFeld: string,
    targetZeit: string,
    targetDatum?: string
  ) => {
    e.preventDefault()

    if (!draggedSpiel) return

    // Prüfe Jahrgangs-Beschränkungen für das Zielfeld (mit Datum)
    const zielFeld = feldEinstellungen.find(f => f.name === targetFeld)
    if (zielFeld) {
      const spielKategorie = draggedSpiel.kategorie
      const datum = targetDatum || selectedDate

      // Extrahiere die Basisjahrgangskategorie (ohne Niveau-Zusätze)
      const basisKategorie = spielKategorie.split(' (')[0]

      console.log(`🎯 Drag & Drop Prüfung:`)
      console.log(`  - Spiel: ${draggedSpiel.team1} vs ${draggedSpiel.team2}`)
      console.log(`  - Kategorie: ${basisKategorie}`)
      console.log(`  - Zielfeld: ${targetFeld} (ID: ${zielFeld.id})`)
      console.log(`  - Datum: ${datum}`)
      console.log(`  - Tag-spezifische Jahrgänge:`, zielFeld.erlaubteJahrgaengeProTag?.[datum])
      console.log(`  - Standard-Jahrgänge:`, zielFeld.erlaubteJahrgaenge)

      // Prüfe ob die Kategorie des Spiels auf dem Zielfeld an diesem Tag erlaubt ist
      const istErlaubt = istJahrgangErlaubtAufFeldProTag(
        basisKategorie,
        zielFeld.id,
        datum
      )

      console.log(`  - Ergebnis: ${istErlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)

      if (!istErlaubt) {
        // Bestimme welche Jahrgänge an diesem Tag erlaubt sind
        const jahrgaengeProTag = zielFeld.erlaubteJahrgaengeProTag?.[datum]
        const erlaubteJahrgaenge =
          jahrgaengeProTag && jahrgaengeProTag.length > 0
            ? jahrgaengeProTag
            : zielFeld.erlaubteJahrgaenge.length > 0
            ? zielFeld.erlaubteJahrgaenge
            : ['Alle Jahrgänge']

        alert(
          `⚠️ Fehler: Spiel "${basisKategorie}" kann nicht auf "${targetFeld}" am ${formatTurnierDate(
            datum
          )} platziert werden.\n\nErlaubte Jahrgänge für ${targetFeld} an diesem Tag: ${erlaubteJahrgaenge.join(
            ', '
          )}`
        )
        setDraggedSpiel(null)
        return
      }
    }

    // Spiel auf neues Feld/Zeit/Datum verschieben
    const updatedSpiel = {
      ...draggedSpiel,
      feld: targetFeld,
      zeit: targetZeit,
      datum: targetDatum || selectedDate
    }

    try {
      const response = await fetch('/api/spielplan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          spielId: draggedSpiel.id,
          spiel: updatedSpiel
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Verschieben des Spiels')
      }

      // Lokale Aktualisierung
      setSpiele(prev =>
        prev.map(s => (s.id === draggedSpiel.id ? updatedSpiel : s))
      )
    } catch (error) {
      console.error('Fehler beim Verschieben des Spiels:', error)
      alert('Fehler beim Verschieben des Spiels')
    }

    setDraggedSpiel(null)
  }

  // Helfer-Hilfsfunktionen
  const generateHelferTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
    return slots
  }

  const isTimeInRange = (time: string, startTime: string, endTime: string) => {
    const timeValue = parseInt(time.replace(':', ''))
    const startValue = parseInt(startTime.replace(':', ''))
    const endValue = parseInt(endTime.replace(':', ''))
    return timeValue >= startValue && timeValue < endValue
  }

  const getHelferAnmeldungenForBedarf = (bedarfId: string) => {
    return helferAnmeldungen.filter(
      anmeldung => anmeldung.helferBedarfId === bedarfId
    )
  }

  // Helfer Drag & Drop Funktionen
  const handleHelferDragStart = (e: React.DragEvent, bedarf: HelferBedarf) => {
    setDraggedHelferBedarf(bedarf)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleHelferDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleHelferDrop = async (
    e: React.DragEvent,
    targetDatum: string,
    targetZeit: string
  ) => {
    e.preventDefault()

    if (!draggedHelferBedarf) return

    // Berechne neue Start- und Endzeit basierend auf der ursprünglichen Dauer
    const originalStart = draggedHelferBedarf.startzeit
    const originalEnd = draggedHelferBedarf.endzeit
    const startHour = parseInt(originalStart.split(':')[0])
    const startMinute = parseInt(originalStart.split(':')[1])
    const endHour = parseInt(originalEnd.split(':')[0])
    const endMinute = parseInt(originalEnd.split(':')[1])

    const durationHours = endHour - startHour
    const durationMinutes = endMinute - startMinute

    const newStartHour = parseInt(targetZeit.split(':')[0])
    const newStartMinute = parseInt(targetZeit.split(':')[1])
    const newEndHour = newStartHour + durationHours
    const newEndMinute = newStartMinute + durationMinutes

    const newStartzeit = `${newStartHour
      .toString()
      .padStart(2, '0')}:${newStartMinute.toString().padStart(2, '0')}`
    const newEndzeit = `${newEndHour.toString().padStart(2, '0')}:${newEndMinute
      .toString()
      .padStart(2, '0')}`

    // Aktualisiere den Helfer-Bedarf
    const updatedBedarf = {
      ...draggedHelferBedarf,
      datum: targetDatum,
      startzeit: newStartzeit,
      endzeit: newEndzeit
    }

    try {
      const response = await fetch('/api/helfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_bedarf',
          bedarfId: draggedHelferBedarf.id,
          bedarf: updatedBedarf
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Verschieben des Helfer-Bedarf')
      }

      // Lokale Aktualisierung
      setHelferBedarf(prev =>
        prev.map(b => (b.id === draggedHelferBedarf.id ? updatedBedarf : b))
      )
    } catch (error) {
      console.error('Fehler beim Verschieben des Helfer-Bedarf:', error)
      alert('Fehler beim Verschieben des Helfer-Bedarf')
    }

    setDraggedHelferBedarf(null)
  }

  const updateFeldEinstellungen = (
    feldId: string,
    field: keyof FeldEinstellungen,
    value: any
  ) => {
    const updatedSettings = feldEinstellungen.map(feld =>
      feld.id === feldId ? { ...feld, [field]: value } : feld
    )
    setFeldEinstellungen(updatedSettings)

    // Save to database immediately
    saveFeldEinstellungen(updatedSettings)
  }

  const saveFeldEinstellungen = async (settings: FeldEinstellungen[]) => {
    try {
      const response = await fetch('/api/admin/feld-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feldEinstellungen: settings })
      })

      if (!response.ok) {
        throw new Error('Failed to save field settings')
      }

      console.log('✅ Feldeinstellungen gespeichert')
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Feldeinstellungen:', error)
      // toast.error('Fehler beim Speichern der Feldeinstellungen');
    }
  }

  const addJahrgangToFeld = (feldId: string, jahrgang: string) => {
    const updatedSettings = feldEinstellungen.map(feld => {
      if (feld.id === feldId && !feld.erlaubteJahrgaenge.includes(jahrgang)) {
        return {
          ...feld,
          erlaubteJahrgaenge: [...feld.erlaubteJahrgaenge, jahrgang]
        }
      }
      return feld
    })
    setFeldEinstellungen(updatedSettings)
    saveFeldEinstellungen(updatedSettings)
  }

  // Neue Funktionen für Tag-spezifische Jahrgang-Verwaltung
  const addJahrgangToFeldProTag = (
    feldId: string,
    datum: string,
    jahrgang: string
  ) => {
    console.log(`🔧 [addJahrgangToFeldProTag] Füge hinzu: ${jahrgang} zu Feld ${feldId} am ${datum}`)
    
    const updatedSettings = feldEinstellungen.map(feld => {
      if (feld.id === feldId) {
        const currentJahrgaenge = feld.erlaubteJahrgaengeProTag[datum] || []
        console.log(`📋 [addJahrgangToFeldProTag] Aktuelle Jahrgänge für ${feld.name} am ${datum}:`, currentJahrgaenge)
        
        if (!currentJahrgaenge.includes(jahrgang)) {
          const updated = {
            ...feld,
            erlaubteJahrgaengeProTag: {
              ...feld.erlaubteJahrgaengeProTag,
              [datum]: [...currentJahrgaenge, jahrgang]
            }
          }
          console.log(`✅ [addJahrgangToFeldProTag] Neuer Stand für ${feld.name}:`, updated.erlaubteJahrgaengeProTag)
          return updated
        }
      }
      return feld
    })
    
    console.log(`💾 [addJahrgangToFeldProTag] Speichere aktualisierte Einstellungen`)
    setFeldEinstellungen(updatedSettings)
    saveFeldEinstellungen(updatedSettings)
  }

  const removeJahrgangFromFeldProTag = (
    feldId: string,
    datum: string,
    jahrgang: string
  ) => {
    const updatedSettings = feldEinstellungen.map(feld => {
      if (feld.id === feldId) {
        const currentJahrgaenge = feld.erlaubteJahrgaengeProTag[datum] || []
        return {
          ...feld,
          erlaubteJahrgaengeProTag: {
            ...feld.erlaubteJahrgaengeProTag,
            [datum]: currentJahrgaenge.filter(j => j !== jahrgang)
          }
        }
      }
      return feld
    })
    setFeldEinstellungen(updatedSettings)
    saveFeldEinstellungen(updatedSettings)
  }

  const removeJahrgangFromFeld = (feldId: string, jahrgang: string) => {
    const updatedSettings = feldEinstellungen.map(feld => {
      if (feld.id === feldId) {
        return {
          ...feld,
          erlaubteJahrgaenge: feld.erlaubteJahrgaenge.filter(
            j => j !== jahrgang
          )
        }
      }
      return feld
    })
    setFeldEinstellungen(updatedSettings)
    saveFeldEinstellungen(updatedSettings)
  }

  const alleJahrgaengeZuFeldHinzufuegen = (feldId: string) => {
    setFeldEinstellungen(prev =>
      prev.map(feld => {
        if (feld.id === feldId) {
          return { ...feld, erlaubteJahrgaenge: [...VERFÜGBARE_JAHRGÄNGE] }
        }
        return feld
      })
    )
  }

  const alleJahrgaengeVonFeldEntfernen = (feldId: string) => {
    setFeldEinstellungen(prev =>
      prev.map(feld => {
        if (feld.id === feldId) {
          return { ...feld, erlaubteJahrgaenge: [] }
        }
        return feld
      })
    )
  }

  // Prüft, ob ein Jahrgang auf einem bestimmten Feld spielen darf
  const istJahrgangErlaubtAufFeld = (
    kategorie: string,
    feldId: string,
    datum?: string
  ): boolean => {
    console.log(`🔍 [istJahrgangErlaubtAufFeld] Prüfe: ${kategorie} auf Feld-ID ${feldId}${datum ? ` am ${datum}` : ''}`)
    
    const feld = feldEinstellungen.find(f => f.id === feldId)
    if (!feld) {
      console.log(`❌ [istJahrgangErlaubtAufFeld] Feld mit ID ${feldId} nicht gefunden`)
      return false
    }

    console.log(`📋 [istJahrgangErlaubtAufFeld] Feld gefunden: ${feld.name}`)

    // Wenn ein Datum angegeben ist, prüfe erst Tag-spezifische Einstellungen
    if (datum) {
      const jahrgaengeProTag = feld.erlaubteJahrgaengeProTag?.[datum]
      console.log(`📅 [istJahrgangErlaubtAufFeld] Tag-spezifische Jahrgänge für ${datum}:`, jahrgaengeProTag)
      
      if (jahrgaengeProTag && jahrgaengeProTag.length > 0) {
        console.log(`✅ [istJahrgangErlaubtAufFeld] Verwende Tag-spezifische Beschränkungen`)
        
        // E-Jugend Kompatibilität
        if (kategorie === 'E-Jugend') {
          const erlaubt = jahrgaengeProTag.some(erlaubter =>
            erlaubter.includes('E-Jugend')
          )
          console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeld] E-Jugend Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
          return erlaubt
        }

        // Spezielle Behandlung für Mini-Kategorien
        if (kategorie.includes('Mini')) {
          const erlaubt = jahrgaengeProTag.some(erlaubter =>
            erlaubter.includes('Mini')
          )
          console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeld] Mini Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
          return erlaubt
        }

        // Für alle anderen Kategorien: Exakte Übereinstimmung
        const erlaubt = jahrgaengeProTag.includes(kategorie)
        console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeld] Standard Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
        return erlaubt
      }
    }

    console.log(`🔄 [istJahrgangErlaubtAufFeld] Verwende Standard-Feld-Beschränkungen`)
    console.log(`🏟️ [istJahrgangErlaubtAufFeld] Standard-Jahrgänge:`, feld.erlaubteJahrgaenge)

    // Fallback auf allgemeine Feld-Einstellungen
    // Wenn keine Jahrgänge zugeordnet sind, sind alle erlaubt
    if (feld.erlaubteJahrgaenge.length === 0) {
      console.log(`✅ [istJahrgangErlaubtAufFeld] Alle Jahrgänge erlaubt (keine Beschränkungen)`)
      return true
    }

    // E-Jugend Kompatibilität
    if (kategorie === 'E-Jugend') {
      const erlaubt = feld.erlaubteJahrgaenge.some(erlaubter =>
        erlaubter.includes('E-Jugend')
      )
      console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeld] E-Jugend Standard Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
      return erlaubt
    }

    // Spezielle Behandlung für Mini-Kategorien
    if (kategorie.includes('Mini')) {
      const erlaubt = feld.erlaubteJahrgaenge.some(erlaubter =>
        erlaubter.includes('Mini')
      )
      console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeld] Mini Standard Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
      return erlaubt
    }

    // Für alle anderen Kategorien: Exakte Übereinstimmung
    const erlaubt = feld.erlaubteJahrgaenge.includes(kategorie)
    console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeld] Standard Exakt Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
    return erlaubt
  }

  // Neue Funktion: Prüft, ob ein Jahrgang auf einem bestimmten Feld an einem bestimmten Tag spielen darf
  const istJahrgangErlaubtAufFeldProTag = (
    kategorie: string,
    feldId: string,
    datum: string
  ): boolean => {
    console.log(`🔍 [istJahrgangErlaubtAufFeldProTag] Prüfe: ${kategorie} auf Feld-ID ${feldId} am ${datum}`)
    
    const feld = feldEinstellungen.find(f => f.id === feldId)
    if (!feld) {
      console.log(`❌ [istJahrgangErlaubtAufFeldProTag] Feld mit ID ${feldId} nicht gefunden`)
      return false
    }

    console.log(`📋 [istJahrgangErlaubtAufFeldProTag] Feld gefunden: ${feld.name}`)
    console.log(`📅 [istJahrgangErlaubtAufFeldProTag] Tag-spezifische Jahrgänge:`, feld.erlaubteJahrgaengeProTag?.[datum])
    console.log(`🏟️ [istJahrgangErlaubtAufFeldProTag] Standard-Jahrgänge:`, feld.erlaubteJahrgaenge)

    // Prüfe zuerst Tag-spezifische Einstellungen
    const jahrgaengeProTag = feld.erlaubteJahrgaengeProTag?.[datum]
    if (jahrgaengeProTag && jahrgaengeProTag.length > 0) {
      console.log(`✅ [istJahrgangErlaubtAufFeldProTag] Verwende Tag-spezifische Beschränkungen`)
      
      // E-Jugend Kompatibilität
      if (kategorie === 'E-Jugend') {
        const erlaubt = jahrgaengeProTag.some(erlaubter =>
          erlaubter.includes('E-Jugend')
        )
        console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeldProTag] E-Jugend Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
        return erlaubt
      }

      // Spezielle Behandlung für Mini-Kategorien
      if (kategorie.includes('Mini')) {
        const erlaubt = jahrgaengeProTag.some(erlaubter => erlaubter.includes('Mini'))
        console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeldProTag] Mini Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
        return erlaubt
      }

      // Für alle anderen Kategorien: Exakte Übereinstimmung
      const erlaubt = jahrgaengeProTag.includes(kategorie)
      console.log(`🏃‍♂️ [istJahrgangErlaubtAufFeldProTag] Standard Check: ${erlaubt ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
      return erlaubt
    }

    console.log(`🔄 [istJahrgangErlaubtAufFeldProTag] Keine Tag-spezifischen Beschränkungen - verwende Fallback`)
    // Fallback auf allgemeine Feld-Einstellungen
    const fallbackResult = istJahrgangErlaubtAufFeld(kategorie, feldId)
    console.log(`🏁 [istJahrgangErlaubtAufFeldProTag] Fallback Ergebnis: ${fallbackResult ? 'ERLAUBT' : 'NICHT ERLAUBT'}`)
    return fallbackResult
  }

  const generateTimeSlots = (): string[] => {
    const slots: string[] = []

    // Bestimme Start- und Endzeit basierend auf dem ausgewählten Datum
    let startzeit = '09:00'
    let endzeit = '18:00'

    if (
      selectedDate === turnierEinstellungen.turnierStartDatum ||
      selectedDate === '2025-07-05'
    ) {
      // Samstag
      startzeit = turnierEinstellungen.samstagStartzeit || '09:00'
      endzeit = turnierEinstellungen.samstagEndzeit || '18:00'
    } else if (
      selectedDate === turnierEinstellungen.turnierEndDatum ||
      selectedDate === '2025-07-06'
    ) {
      // Sonntag
      startzeit = turnierEinstellungen.sonntagStartzeit || '09:00'
      endzeit = turnierEinstellungen.sonntagEndzeit || '18:00'
    }

    // Parse Zeiten zu Minuten
    const parseTime = (timeString: string): number => {
      const [hours, minutes] = timeString.split(':').map(Number)
      return hours * 60 + minutes
    }

    const startMinutes = parseTime(startzeit)
    const endMinutes = parseTime(endzeit)

    // Generiere Slots in 15-Minuten-Intervallen
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      slots.push(
        `${hour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}`
      )
    }

    return slots
  }

  // Debug-Funktion zum Anzeigen der verfügbaren Spiele
  const debugSpiele = () => {
    console.log('🔍 DEBUG: Verfügbare Spiele:', spiele.length)
    console.log('🎯 Aktuell ausgewähltes Datum:', selectedDate)
    console.log(
      '📅 Turnier Start-Datum:',
      turnierEinstellungen.turnierStartDatum
    )
    console.log('📅 Turnier End-Datum:', turnierEinstellungen.turnierEndDatum)

    if (spiele.length > 0) {
      console.log('📋 Alle Spiele:')
      spiele.forEach((spiel, index) => {
        console.log(
          `${index + 1}. ${spiel.team1} vs ${spiel.team2} - ${spiel.feld} um ${
            spiel.zeit
          } am ${spiel.datum}`
        )
      })
      console.log('🏟️ Verfügbare Felder:', [
        ...new Set(spiele.map(s => s.feld))
      ])
      console.log(
        '⏰ Verfügbare Zeiten:',
        [...new Set(spiele.map(s => s.zeit))].sort()
      )
      console.log('📅 Verfügbare Daten:', [
        ...new Set(spiele.map(s => s.datum))
      ])

      // Test: Finde Spiele für das ausgewählte Datum
      const spieleForSelectedDate = spiele.filter(s => s.datum === selectedDate)
      console.log(
        `🎯 Spiele für ausgewähltes Datum (${selectedDate}):`,
        spieleForSelectedDate.length
      )
      if (spieleForSelectedDate.length === 0 && spiele.length > 0) {
        console.log(
          '⚠️ PROBLEM: Keine Spiele für das ausgewählte Datum gefunden!'
        )
        console.log('💡 Verfügbare Datum-Optionen:', [
          ...new Set(spiele.map(s => s.datum))
        ])
      }
    } else {
      console.log('⚠️ Keine Spiele in der Liste')
    }
  }

  // Debug-Aufruf wenn Spiele sich ändern oder selectedDate wechselt
  useEffect(() => {
    debugSpiele()
  }, [spiele, selectedDate])

  const getSpielForSlot = (
    feld: string,
    zeit: string,
    datum: string
  ): Spiel | null => {
    // Suche nach einem Spiel für die gegebenen Parameter
    const gefundenesSpiel = spiele.find(s => {
      const feldMatch = s.feld === feld
      const zeitMatch = s.zeit === zeit
      const datumMatch = s.datum === datum

      // Debug-Log für besseres Verständnis
      if (spiele.length > 0 && zeit === '09:00') {
        console.log(`🔍 Suche Spiel für ${feld}|${zeit}|${datum}:`)
        console.log(`  - Feld Match: ${feldMatch} (${s.feld} === ${feld})`)
        console.log(`  - Zeit Match: ${zeitMatch} (${s.zeit} === ${zeit})`)
        console.log(`  - Datum Match: ${datumMatch} (${s.datum} === ${datum})`)
      }

      return feldMatch && zeitMatch && datumMatch
    })

    // Debug nur bei Fund oder für erste Zeit-Slots
    if (gefundenesSpiel) {
      console.log(
        `✅ Spiel gefunden: ${gefundenesSpiel.team1} vs ${gefundenesSpiel.team2} auf ${feld} um ${zeit} am ${datum}`
      )
    }

    return gefundenesSpiel || null
  }

  const deleteSpiel = async (spielId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Spiel löschen möchten?')) {
      return
    }

    try {
      const response = await fetch('/api/spielplan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          spielId: spielId
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Löschen des Spiels')
      }

      // Lokale Aktualisierung
      setSpiele(prev => prev.filter(s => s.id !== spielId))
      alert('Spiel erfolgreich gelöscht!')
    } catch (error) {
      console.error('Fehler beim Löschen des Spiels:', error)
      alert('Fehler beim Löschen des Spiels')
    }
  }

  const updateSpielTeams = async (
    spielId: string,
    team1: string,
    team2: string
  ) => {
    try {
      const response = await fetch('/api/spielplan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          spielId: spielId,
          spiel: { team1, team2 }
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren der Teams')
      }

      // Lokale Aktualisierung
      setSpiele(prev =>
        prev.map(s => (s.id === spielId ? { ...s, team1, team2 } : s))
      )

      setEditingSpiel(null)
      setShowSpielDialog(false)
      alert('Teams erfolgreich aktualisiert!')
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Teams:', error)
      alert('Fehler beim Aktualisieren der Teams')
    }
  }

  const getAllTeamNames = (): string[] => {
    const teamNames = new Set<string>()
    anmeldungen.forEach(anmeldung => {
      anmeldung.teams.forEach(team => {
        for (let i = 1; i <= team.anzahl; i++) {
          teamNames.add(`${anmeldung.verein} ${team.kategorie} ${i}`)
        }
      })
    })
    return Array.from(teamNames).sort()
  }

  const saveSettings = async () => {
    try {
      setSaving(true)

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save_settings',
          settings: turnierEinstellungen
        })
      })

      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Einstellungen')
      }

      const data = await response.json()

      alert('Einstellungen erfolgreich gespeichert!')

      // Aktualisiere die lokalen Einstellungen
      setTurnierEinstellungen(prev => ({ ...prev, ...data.settings }))
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error)
      alert('Fehler beim Speichern der Einstellungen')
    } finally {
      setSaving(false)
    }
  }

  const handleExportAnmeldungenCSV = () => {
    exportAnmeldungenCSV(anmeldungen)
  }

  const handleExportSpielplanPDF = async () => {
    try {
      console.log('📄 Exportiere', spiele.length, 'Spiele als PDF')

      if (spiele.length === 0) {
        alert(
          '❌ Keine Spiele vorhanden! Bitte erst einen Spielplan erstellen.'
        )
        return
      }

      // Verwende die einfache PDF-Export-Funktion
      exportSimpleSpielplanPDF(spiele, {
        turnierName: turnierEinstellungen.turnierName || 'Turnier',
        startgeld: String(turnierEinstellungen.startgeld || '25'),
        schiriGeld: String(turnierEinstellungen.schiriGeld || '20'),
        turnierStartDatum:
          turnierEinstellungen.turnierStartDatum || '2025-07-05',
        turnierEndDatum: turnierEinstellungen.turnierEndDatum || '2025-07-06'
      })
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error)

      // Fallback: CSV-Export
      try {
        console.log('💾 Fallback: CSV-Export')
        exportSpielplanCSV(spiele, {
          turnierName: turnierEinstellungen.turnierName || 'Turnier',
          startgeld: String(turnierEinstellungen.startgeld || '25'),
          schiriGeld: String(turnierEinstellungen.schiriGeld || '20'),
          turnierStartDatum:
            turnierEinstellungen.turnierStartDatum || '2025-07-05',
          turnierEndDatum: turnierEinstellungen.turnierEndDatum || '2025-07-06'
        })
        alert('PDF-Export fehlgeschlagen, aber CSV wurde erstellt.')
      } catch (csvError) {
        console.error('Auch CSV-Export fehlgeschlagen:', csvError)
        alert('Fehler beim Export. Bitte versuchen Sie es erneut.')
      }
    }
  }

  const handlePreviewSpielplanPDF = () => {
    try {
      console.log('👁️ Zeige PDF-Vorschau für', spiele.length, 'Spiele')

      if (spiele.length === 0) {
        alert(
          '❌ Keine Spiele vorhanden! Bitte erst einen Spielplan erstellen.'
        )
        return
      }

      previewSpielplanPDF(spiele, {
        turnierName: turnierEinstellungen.turnierName || 'Turnier',
        startgeld: String(turnierEinstellungen.startgeld || '25'),
        schiriGeld: String(turnierEinstellungen.schiriGeld || '20'),
        turnierStartDatum:
          turnierEinstellungen.turnierStartDatum || '2025-07-05',
        turnierEndDatum: turnierEinstellungen.turnierEndDatum || '2025-07-06'
      })
    } catch (error) {
      console.error('Fehler bei PDF-Vorschau:', error)
      alert('Fehler bei der PDF-Vorschau. Bitte versuchen Sie es erneut.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'angemeldet':
        return (
          <Badge
            variant='outline'
            className='bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-medium'
          >
            <Clock className='w-3 h-3 mr-1' />
            Ausstehend
          </Badge>
        )
      case 'bezahlt':
        return (
          <Badge
            variant='outline'
            className='bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-medium'
          >
            <CheckCircle className='w-3 h-3 mr-1' />
            Bezahlt
          </Badge>
        )
      case 'storniert':
        return (
          <Badge
            variant='outline'
            className='bg-red-500/10 text-red-600 border-red-500/30 text-xs font-medium'
          >
            <XCircle className='w-3 h-3 mr-1' />
            Storniert
          </Badge>
        )
      default:
        return (
          <Badge
            variant='outline'
            className='bg-slate-500/10 text-slate-600 border-slate-500/30 text-xs font-medium'
          >
            {status}
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Kein Datum'
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Ungültiges Datum'

      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Fehler beim Formatieren des Datums:', error)
      return 'Formatierungsfehler'
    }
  }

  const formatTurnierDate = (dateString: string) => {
    try {
      if (!dateString) return 'Kein Datum ausgewählt'

      // Setze die Zeit auf Mittag, um Probleme mit der Zeitzonenkonvertierung zu vermeiden
      const date = new Date(`${dateString}T12:00:00`)

      // Überprüfe, ob das Datum gültig ist
      if (isNaN(date.getTime())) {
        console.error('Ungültiges Datum:', dateString)
        return 'Ungültiges Datum'
      }

      const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' })
      const formattedDate = date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      return `${
        weekday.charAt(0).toUpperCase() + weekday.slice(1)
      } ${formattedDate}`
    } catch (error) {
      console.error('Fehler beim Formatieren des Datums:', error)
      return 'Fehler beim Formatieren'
    }
  }

  const updateSettings = (field: keyof TurnierEinstellungen, value: any) => {
    setTurnierEinstellungen(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleExportStatistikenCSV = () => {
    exportStatistikenCSV(statistiken, anmeldungen)
  }

  // Check if user is authenticated
  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='p-6 bg-white rounded-xl shadow-lg mb-6 border'>
            <RefreshCw className='h-8 w-8 animate-spin mx-auto text-blue-600' />
          </div>
          <p className='text-lg text-slate-700 mb-2 font-medium'>
            Dashboard wird geladen...
          </p>
          <p className='text-sm text-slate-500'>
            Daten werden vom Server abgerufen
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-white'>
      {/* Header */}
      <header className='bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 py-4'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div className='flex items-center gap-4 sm:gap-6'>
              <Link href="/" className='flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200'>
                <ArrowLeft className='h-4 w-4' />
                <span className='font-medium text-sm hidden sm:inline'>
                  Zurück zur Website
                </span>
                <span className='font-medium text-sm sm:hidden'>Zurück</span>
              </Link>
              <div className='flex items-center gap-3'>
                {/* Handball Ball Icon */}
                <div className='w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center'>
                  <div className='w-7 h-7 bg-white rounded-full flex items-center justify-center'>
                    <div className='w-3 h-3 bg-orange-500 rounded-full'></div>
                  </div>
                </div>
                <div>
                  <h1 className='text-lg sm:text-xl font-bold text-gray-800'>
                    Turnier-Verwaltung
                  </h1>
                  <p className='text-xs text-gray-500 hidden sm:block'>
                    SV Puschendorf • Admin-Dashboard
                  </p>
                </div>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2 sm:gap-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={refreshData}
                disabled={loading}
                className='text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors'
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 sm:mr-2 ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
                <span className='hidden sm:inline'>Aktualisieren</span>
                <span className='sm:hidden'>Update</span>
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={async () => {
                  console.log('🔓 Logout-Button geklickt')
                  try {
                    await fetch('/api/auth/logout', {
                      method: 'POST',
                      credentials: 'same-origin'
                    })
                    router.replace('/admin/login')
                  } catch (error) {
                    console.error('Logout error:', error)
                    // Force redirect even if logout fails
                    router.replace('/admin/login')
                  }
                }}
                className='text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors'
              >
                <LogOut className='h-4 w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>Abmelden</span>
                <span className='sm:hidden'>Logout</span>
              </Button>
              <div className='flex items-center gap-2 text-sm'>
                <div className='w-2 h-2 bg-orange-500 rounded-full animate-pulse'></div>
                <span className='text-gray-600 text-xs font-medium hidden sm:inline'>
                  Online
                </span>
              </div>
              <Badge
                variant='outline'
                className='bg-orange-50 text-orange-700 border-orange-200 px-2 sm:px-3 py-1 font-medium'
              >
                <Users className='w-3 h-3 mr-1' />
                <span className='hidden sm:inline'>Administrator</span>
                <span className='sm:hidden'>Admin</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
        {/* Statistik-Karten */}
        <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-10'>
          <Card className='bg-white border-gray-200 shadow-sm hover:shadow-md transition-all duration-200'>
            <CardContent className='p-4 sm:p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs sm:text-sm font-medium text-gray-600 mb-1'>
                    Anmeldungen
                  </p>
                  <p className='text-xl sm:text-3xl font-bold text-gray-800'>
                    {statistiken.anmeldungen}
                  </p>
                  <p className='text-xs text-gray-500 mt-1 hidden sm:block'>
                    Aktive Registrierungen
                  </p>
                </div>
                <div className='p-2 sm:p-3 bg-orange-100 rounded-xl'>
                  <Users className='h-4 w-4 sm:h-6 sm:w-6 text-orange-600' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white border-gray-200 shadow-sm hover:shadow-md transition-all duration-200'>
            <CardContent className='p-4 sm:p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs sm:text-sm font-medium text-gray-600 mb-1'>
                    Teams gesamt
                  </p>
                  <p className='text-xl sm:text-3xl font-bold text-gray-800'>
                    {statistiken.teams}
                  </p>
                  <p className='text-xs text-gray-500 mt-1 hidden sm:block'>
                    Alle Kategorien
                  </p>
                </div>
                <div className='p-2 sm:p-3 bg-orange-100 rounded-xl'>
                  <Trophy className='h-4 w-4 sm:h-6 sm:w-6 text-orange-600' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white border-gray-200 shadow-sm hover:shadow-md transition-all duration-200'>
            <CardContent className='p-4 sm:p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs sm:text-sm font-medium text-gray-600 mb-1'>
                    Einnahmen
                  </p>
                  <p className='text-xl sm:text-3xl font-bold text-gray-800'>
                    {statistiken.gesamtKosten}€
                  </p>
                  <p className='text-xs text-gray-500 mt-1 hidden sm:block'>
                    Erwartete Einnahmen
                  </p>
                </div>
                <div className='p-2 sm:p-3 bg-orange-100 rounded-xl'>
                  <Euro className='h-4 w-4 sm:h-6 sm:w-6 text-orange-600' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-white border-gray-200 shadow-sm hover:shadow-md transition-all duration-200'>
            <CardContent className='p-4 sm:p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs sm:text-sm font-medium text-gray-600 mb-1'>
                    Bezahlt
                  </p>
                  <p className='text-xl sm:text-3xl font-bold text-orange-600'>
                    {statistiken.bezahlt}
                  </p>
                  <p className='text-xs text-gray-500 mt-1 hidden sm:block'>
                    Bestätigte Zahlungen
                  </p>
                </div>
                <div className='p-2 sm:p-3 bg-orange-100 rounded-xl'>
                  <CheckCircle className='h-4 w-4 sm:h-6 sm:w-6 text-orange-600' />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigations-Tabs */}
        <Tabs defaultValue='anmeldungen' className='w-full'>
          <div className='w-full overflow-x-auto scrollbar-hide mb-6 sm:mb-10'>
            <TabsList className='flex w-full min-w-max sm:min-w-0 justify-between bg-white border border-gray-200 p-1 rounded-xl shadow-sm relative'>
              <TabsTrigger
                value='anmeldungen'
                className='data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-800 transition-all duration-200 py-2 sm:py-3 px-1.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0'
              >
                <Users className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>Anmeldungen</span>
                <span className='sm:hidden'>Anm.</span>
              </TabsTrigger>
              <TabsTrigger
                value='spielplan'
                className='data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-800 transition-all duration-200 py-2 sm:py-3 px-1.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0'
              >
                <CalendarIcon className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>Spielplan</span>
                <span className='sm:hidden'>Plan</span>
              </TabsTrigger>
              <TabsTrigger
                value='live'
                className='data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-800 transition-all duration-200 py-2 sm:py-3 px-1.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0'
              >
                <Activity className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>Live Games</span>
                <span className='sm:hidden'>Live</span>
              </TabsTrigger>
              <TabsTrigger
                value='ergebnisse'
                className='data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-800 transition-all duration-200 py-2 sm:py-3 px-1.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0'
              >
                <Trophy className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>Ergebnisse</span>
                <span className='sm:hidden'>Erg.</span>
              </TabsTrigger>
              <TabsTrigger
                value='helfer'
                className='data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-800 transition-all duration-200 py-2 sm:py-3 px-1.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0'
              >
                <Shield className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>Personal</span>
                <span className='sm:hidden'>Team</span>
              </TabsTrigger>
              <TabsTrigger
                value='einstellungen'
                className='data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-800 transition-all duration-200 py-2 sm:py-3 px-1.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0'
              >
                <Settings className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>Einstellungen</span>
                <span className='sm:hidden'>Set.</span>
              </TabsTrigger>
              <TabsTrigger
                value='export'
                className='data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-800 transition-all duration-200 py-2 sm:py-3 px-1.5 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex-shrink-0'
              >
                <Download className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                <span className='hidden sm:inline'>Export</span>
                <span className='sm:hidden'>Exp.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Anmeldungen Tab */}
          <TabsContent value='anmeldungen' className='mt-6 sm:mt-8'>
            <Card className='bg-white border-gray-200 shadow-sm'>
              <CardHeader className='pb-4 sm:pb-6 border-b border-gray-100'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-orange-100 rounded-lg'>
                      <Users className='h-4 w-4 sm:h-5 sm:w-5 text-orange-600' />
                    </div>
                    <div>
                      <CardTitle className='text-lg sm:text-xl text-gray-800'>
                        Anmeldungen verwalten
                      </CardTitle>
                      <CardDescription className='text-sm text-slate-600 hidden sm:block'>
                        Übersicht aller Team-Registrierungen und
                        Status-Verwaltung
                      </CardDescription>
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setAnmeldungenDebugAction('demo')
                        setShowAnmeldungenDebugDialog(true)
                      }}
                      className='border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-xs sm:text-sm'
                    >
                      <Trophy className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                      <span className='hidden sm:inline'>Demo Teams</span>
                      <span className='sm:hidden'>Demo</span>
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setAnmeldungenDebugAction('flush')
                        setShowAnmeldungenDebugDialog(true)
                      }}
                      className='border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs sm:text-sm'
                    >
                      <Trash2 className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                      <span className='hidden sm:inline'>
                        Anmeldungen leeren
                      </span>
                      <span className='sm:hidden'>Leeren</span>
                    </Button>
                    <Badge
                      variant='outline'
                      className='bg-slate-50 text-slate-700 border-slate-200 text-xs'
                    >
                      {anmeldungen.length} Anmeldungen
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                {anmeldungen.length === 0 ? (
                  <div className='text-center py-12 sm:py-16'>
                    <div className='p-4 bg-slate-100 rounded-full w-fit mx-auto mb-6'>
                      <Users className='h-8 w-8 sm:h-12 sm:w-12 text-slate-400' />
                    </div>
                    <p className='text-slate-700 text-base sm:text-lg mb-2'>
                      Noch keine Anmeldungen
                    </p>
                    <p className='text-slate-500 text-sm mb-4'>
                      Teams werden hier angezeigt, sobald sie sich registrieren
                    </p>
                    <Button
                      variant='outline'
                      onClick={refreshData}
                      disabled={loading}
                      className='border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700 transition-all duration-200'
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${
                          loading ? 'animate-spin' : ''
                        }`}
                      />
                      Daten aktualisieren
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Desktop Tabelle */}
                    <div className='hidden lg:block overflow-x-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow className='border-slate-100 bg-slate-50/50'>
                            <TableHead className='text-slate-700 font-medium py-4 px-6'>
                              Verein
                            </TableHead>
                            <TableHead className='text-slate-700 font-medium py-4 px-6'>
                              Kontakt
                            </TableHead>
                            <TableHead className='text-slate-700 font-medium py-4 px-6'>
                              Teams
                            </TableHead>
                            <TableHead className='text-slate-700 font-medium py-4 px-6'>
                              Kosten
                            </TableHead>
                            <TableHead className='text-slate-700 font-medium py-4 px-6'>
                              Status
                            </TableHead>
                            <TableHead className='text-slate-700 font-medium py-4 px-6'>
                              Datum
                            </TableHead>
                            <TableHead className='text-slate-700 font-medium py-4 px-6'>
                              Aktionen
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {anmeldungen.map(anmeldung => (
                            <TableRow
                              key={anmeldung.id}
                              className='border-slate-100 hover:bg-slate-50/50 transition-colors'
                            >
                              <TableCell className='font-medium text-slate-800 py-4 px-6'>
                                {anmeldung.verein}
                              </TableCell>
                              <TableCell className='py-4 px-6'>
                                <div className='space-y-1'>
                                  <div className='text-slate-700 font-medium'>
                                    {anmeldung.kontakt}
                                  </div>
                                  <div className='text-slate-500 text-sm'>
                                    {anmeldung.email}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className='py-4 px-6'>
                                <div className='space-y-2'>
                                  {anmeldung.teams.map((team, index) => (
                                    <div
                                      key={index}
                                      className='flex items-center gap-2 flex-wrap'
                                    >
                                      <Badge
                                        variant='outline'
                                        className='border-blue-200 text-blue-700 bg-blue-50 px-2 py-1 text-xs'
                                      >
                                        {team.kategorie}
                                      </Badge>
                                      <span className='text-xs text-slate-500'>
                                        {team.anzahl}x
                                      </span>
                                      {team.spielstaerke && (
                                        <Badge
                                          variant='outline'
                                          className={`px-2 py-1 text-xs ${
                                            team.spielstaerke === 'Anfänger'
                                              ? 'border-green-200 text-green-700 bg-green-50'
                                              : team.spielstaerke ===
                                                'Fortgeschritten'
                                              ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                                              : team.spielstaerke === 'Erfahren'
                                              ? 'border-orange-200 text-orange-700 bg-orange-50'
                                              : team.spielstaerke ===
                                                'Sehr erfahren'
                                              ? 'border-red-200 text-red-700 bg-red-50'
                                              : 'border-gray-200 text-gray-700 bg-gray-50'
                                          }`}
                                        >
                                          {team.spielstaerke}
                                        </Badge>
                                      )}
                                      {team.schiri && (
                                        <Badge
                                          variant='outline'
                                          className='border-purple-200 text-purple-700 bg-purple-50 px-2 py-1 text-xs'
                                        >
                                          🟡 Schiri
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className='font-medium text-emerald-600 py-4 px-6'>
                                {anmeldung.kosten}€
                              </TableCell>
                              <TableCell className='py-4 px-6'>
                                {getStatusBadge(anmeldung.status)}
                              </TableCell>
                              <TableCell className='text-slate-500 py-4 px-6 text-sm'>
                                {formatDate(anmeldung.created_at)}
                              </TableCell>
                              <TableCell className='py-4 px-6'>
                                <div className='flex gap-1'>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors p-2 h-8 w-8'
                                    onClick={() =>
                                      setSelectedAnmeldung(anmeldung.id)
                                    }
                                  >
                                    <Eye className='h-3 w-3' />
                                  </Button>
                                  <TeamEmailPopup
                                    teamId={anmeldung.id}
                                    teamName={anmeldung.verein}
                                    trigger={
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors p-2 h-8 w-8'
                                      >
                                        <Mail className='h-4 w-4' />
                                      </Button>
                                    }
                                  />
                                  <Select
                                    value={anmeldung.status}
                                    onValueChange={value =>
                                      updateAnmeldungStatus(anmeldung.id, value)
                                    }
                                  >
                                    <SelectTrigger className='w-32 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors h-8 text-xs'>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className='bg-white border-slate-200'>
                                      <SelectItem
                                        value='angemeldet'
                                        className='text-slate-700 hover:bg-slate-50'
                                      >
                                        Angemeldet
                                      </SelectItem>
                                      <SelectItem
                                        value='bezahlt'
                                        className='text-slate-700 hover:bg-slate-50'
                                      >
                                        Bezahlt
                                      </SelectItem>
                                      <SelectItem
                                        value='storniert'
                                        className='text-slate-700 hover:bg-slate-50'
                                      >
                                        Storniert
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors p-2 h-8 w-8'
                                    onClick={() =>
                                      deleteAnmeldung(
                                        anmeldung.id,
                                        anmeldung.verein
                                      )
                                    }
                                  >
                                    <Trash2 className='h-3 w-3' />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className='lg:hidden space-y-4 p-4'>
                      {anmeldungen.map(anmeldung => (
                        <Card
                          key={anmeldung.id}
                          className='border-slate-200 shadow-sm'
                        >
                          <CardContent className='p-4'>
                            <div className='flex justify-between items-start mb-3'>
                              <div>
                                <h3 className='font-semibold text-slate-800 text-base'>
                                  {anmeldung.verein}
                                </h3>
                                <p className='text-sm text-slate-600'>
                                  {anmeldung.kontakt}
                                </p>
                                <p className='text-xs text-slate-500'>
                                  {anmeldung.email}
                                </p>
                              </div>
                              <div className='text-right'>
                                <div className='font-semibold text-emerald-600 text-lg'>
                                  {anmeldung.kosten}€
                                </div>
                                <div className='text-xs text-slate-500'>
                                  {formatDate(anmeldung.created_at)}
                                </div>
                              </div>
                            </div>

                            <div className='mb-3'>
                              <div className='text-xs text-slate-600 mb-2 font-medium'>
                                Teams:
                              </div>
                              <div className='space-y-2'>
                                {anmeldung.teams.map((team, index) => (
                                  <div
                                    key={index}
                                    className='flex flex-wrap items-center gap-1'
                                  >
                                    <Badge
                                      variant='outline'
                                      className='border-blue-200 text-blue-700 bg-blue-50 px-2 py-1 text-xs'
                                    >
                                      {team.kategorie}
                                    </Badge>
                                    <span className='text-xs text-slate-500'>
                                      {team.anzahl}x
                                    </span>
                                    {team.spielstaerke && (
                                      <Badge
                                        variant='outline'
                                        className={`px-2 py-1 text-xs ${
                                          team.spielstaerke === 'Anfänger'
                                            ? 'border-green-200 text-green-700 bg-green-50'
                                            : team.spielstaerke ===
                                              'Fortgeschritten'
                                            ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                                            : team.spielstaerke === 'Erfahren'
                                            ? 'border-orange-200 text-orange-700 bg-orange-50'
                                            : team.spielstaerke ===
                                              'Sehr erfahren'
                                            ? 'border-red-200 text-red-700 bg-red-50'
                                            : 'border-gray-200 text-gray-700 bg-gray-50'
                                        }`}
                                      >
                                        {team.spielstaerke}
                                      </Badge>
                                    )}
                                    {team.schiri && (
                                      <Badge
                                        variant='outline'
                                        className='border-purple-200 text-purple-700 bg-purple-50 px-2 py-1 text-xs'
                                      >
                                        🟡 Schiri
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className='flex flex-wrap items-center justify-between gap-2'>
                              <div className='flex items-center gap-2'>
                                {getStatusBadge(anmeldung.status)}
                              </div>
                              <div className='flex items-center gap-1'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors p-2 h-8 w-8'
                                  onClick={() =>
                                    setSelectedAnmeldung(anmeldung.id)
                                  }
                                >
                                  <Eye className='h-3 w-3' />
                                </Button>
                                <TeamEmailPopup
                                  teamId={anmeldung.id}
                                  teamName={anmeldung.verein}
                                  trigger={
                                    <Button
                                      variant='ghost'
                                      size='sm'
                                      className='text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors p-2 h-8 w-8'
                                    >
                                      <Mail className='h-4 w-4' />
                                    </Button>
                                  }
                                />
                                <Select
                                  value={anmeldung.status}
                                  onValueChange={value =>
                                    updateAnmeldungStatus(anmeldung.id, value)
                                  }
                                >
                                  <SelectTrigger className='w-24 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors h-8 text-xs'>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className='bg-white border-slate-200'>
                                    <SelectItem
                                      value='angemeldet'
                                      className='text-slate-700 hover:bg-slate-50'
                                    >
                                      Angemeldet
                                    </SelectItem>
                                    <SelectItem
                                      value='bezahlt'
                                      className='text-slate-700 hover:bg-slate-50'
                                    >
                                      Bezahlt
                                    </SelectItem>
                                    <SelectItem
                                      value='storniert'
                                      className='text-slate-700 hover:bg-slate-50'
                                    >
                                      Storniert
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors p-2 h-8 w-8'
                                  onClick={() =>
                                    deleteAnmeldung(
                                      anmeldung.id,
                                      anmeldung.verein
                                    )
                                  }
                                >
                                  <Trash2 className='h-3 w-3' />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ergebnisse Tab */}
          <TabsContent value='ergebnisse' className='mt-8'>
            <div className='space-y-6'>
              {/* ErgebnisseManager */}
              <ErgebnisseManager />
            </div>
          </TabsContent>

          {/* Live Games Tab */}
          <TabsContent value='live' className='mt-8'>
            <LiveGamesDashboard />
          </TabsContent>

          {/* Spielplan Tab */}
          <TabsContent value='spielplan' className='mt-8'>
            <div className='space-y-6'>
              {/* Feld-Einstellungen */}
              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-6 border-b border-slate-100'>
                  <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-orange-100 rounded-lg'>
                        <Settings className='h-5 w-5 text-orange-600' />
                      </div>
                      <div>
                        <CardTitle className='text-xl text-gray-800'>
                          Feld-Einstellungen
                        </CardTitle>
                        <CardDescription className='text-gray-600'>
                          Individuelle Spielzeiten für jedes Feld konfigurieren
                        </CardDescription>
                      </div>
                    </div>
                    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto'>
                      <Button
                        variant='outline'
                        className='border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-medium px-4 transition-all duration-200 w-full sm:w-auto'
                        onClick={resetFeldEinstellungen}
                        disabled={loading}
                      >
                        <RotateCcw className='h-4 w-4 mr-2' />
                        <span className='sm:hidden'>Felder zurücksetzen</span>
                        <span className='hidden sm:inline'>Reset Felder</span>
                      </Button>
                      <Button
                        variant='outline'
                        className='border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium px-4 transition-all duration-200 w-full sm:w-auto'
                        onClick={deleteAllSpiele}
                        disabled={loading || spiele.length === 0}
                      >
                        <Trash2 className='h-4 w-4 mr-2' />
                        <span className='sm:hidden'>Alle Spiele löschen</span>
                        <span className='hidden sm:inline'>Alle löschen</span>
                      </Button>
                      <Button
                        className='bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 transition-all duration-200 w-full sm:w-auto'
                        onClick={generateSpielplan}
                      >
                        <CalendarIcon className='h-4 w-4 mr-2' />
                        <span className='sm:hidden'>Spielplan erstellen</span>
                        <span className='hidden sm:inline'>Spielplan generieren</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-4 sm:p-6'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                    {feldEinstellungen.map(feld => (
                      <div
                        key={feld.id}
                        className='p-3 sm:p-4 border border-slate-200 rounded-lg space-y-3'
                      >
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 bg-orange-500 rounded-full'></div>
                          <Label className='font-medium text-slate-700'>
                            {feld.name}
                          </Label>
                        </div>

                        <div className='space-y-2'>
                          <Label className='text-xs text-slate-600'>
                            Spielzeit (min)
                          </Label>
                          <Input
                            type='number'
                            value={feld.spielzeit}
                            onChange={e =>
                              updateFeldEinstellungen(
                                feld.id,
                                'spielzeit',
                                parseInt(e.target.value)
                              )
                            }
                            className='h-8 text-sm'
                            min='1'
                            max='30'
                          />
                        </div>

                        <div className='space-y-2'>
                          <Label className='text-xs text-slate-600'>
                            Pausenzeit (min)
                          </Label>
                          <Input
                            type='number'
                            value={feld.pausenzeit}
                            onChange={e =>
                              updateFeldEinstellungen(
                                feld.id,
                                'pausenzeit',
                                parseInt(e.target.value)
                              )
                            }
                            className='h-8 text-sm'
                            min='0'
                            max='10'
                          />
                        </div>

                        <div className='flex items-center justify-between'>
                          <Label className='text-xs text-slate-600'>
                            Zwei Halbzeiten
                          </Label>
                          <Switch
                            checked={feld.zweiHalbzeiten}
                            onCheckedChange={checked =>
                              updateFeldEinstellungen(
                                feld.id,
                                'zweiHalbzeiten',
                                checked
                              )
                            }
                            className='data-[state=checked]:bg-orange-500'
                          />
                        </div>

                        {feld.zweiHalbzeiten && (
                          <div className='space-y-2'>
                            <Label className='text-xs text-slate-600'>
                              Halbzeitpause (min)
                            </Label>
                            <Input
                              type='number'
                              value={feld.halbzeitpause}
                              onChange={e =>
                                updateFeldEinstellungen(
                                  feld.id,
                                  'halbzeitpause',
                                  parseInt(e.target.value)
                                )
                              }
                              className='h-8 text-sm'
                              min='0'
                              max='10'
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tag-spezifische Jahrgang-Auswahl */}
              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-6 border-b border-slate-100'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-purple-100 rounded-lg'>
                      <CalendarIcon className='h-5 w-5 text-purple-600' />
                    </div>
                    <div>
                      <CardTitle className='text-xl text-slate-800'>
                        Jahrgänge pro Tag & Feld
                      </CardTitle>
                      <CardDescription className='text-slate-600'>
                        Separate Jahrgang-Zuordnungen für jeden Spieltag
                        konfigurieren
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-6'>
                  {/* Tabs für verschiedene Tage */}
                  <div className='space-y-4'>
                    {/* Erster Turniertag */}
                    <div className='border border-slate-200 rounded-lg p-4'>
                      <div className='flex items-center gap-2 mb-4'>
                        <div className='w-3 h-3 bg-blue-500 rounded-full'></div>
                        <Label className='font-medium text-slate-800'>
                          {tag1} - {new Date(turnierEinstellungen.turnierStartDatum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </Label>
                      </div>
                      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
                        {feldEinstellungen.map(feld => {
                          const jahrgaengeTag1 =
                            feld.erlaubteJahrgaengeProTag?.[turnierEinstellungen.turnierStartDatum] || []
                          return (
                            <div
                              key={`${feld.id}-tag1`}
                              className='p-3 border border-slate-100 rounded-lg bg-slate-50'
                            >
                              <div className='text-sm font-medium text-slate-700 mb-2'>
                                {feld.name}
                              </div>

                              {/* Jahrgang hinzufügen */}
                              <Select
                                onValueChange={value =>
                                  addJahrgangToFeldProTag(
                                    feld.id,
                                    turnierEinstellungen.turnierStartDatum,
                                    value
                                  )
                                }
                              >
                                <SelectTrigger className='h-7 text-xs mb-2'>
                                  <SelectValue placeholder='Jahrgang...' />
                                </SelectTrigger>
                                <SelectContent>
                                  {VERFÜGBARE_JAHRGÄNGE.filter(
                                    jahrgang =>
                                      !jahrgaengeTag1.includes(jahrgang)
                                  ).map(jahrgang => (
                                    <SelectItem key={jahrgang} value={jahrgang}>
                                      {jahrgang}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Zugewiesene Jahrgänge */}
                              <div className='flex flex-wrap gap-1'>
                                {jahrgaengeTag1.length === 0 ? (
                                  <span className='text-xs text-slate-500 italic'>
                                    Standard-Einstellungen
                                  </span>
                                ) : (
                                  jahrgaengeTag1.map(jahrgang => (
                                    <Badge
                                      key={jahrgang}
                                      variant='secondary'
                                      className='text-xs px-1 py-0.5 bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer'
                                      onClick={() =>
                                        removeJahrgangFromFeldProTag(
                                          feld.id,
                                          turnierEinstellungen.turnierStartDatum,
                                          jahrgang
                                        )
                                      }
                                    >
                                      {jahrgang.length > 6
                                        ? jahrgang.substring(0, 6) + '...'
                                        : jahrgang}
                                      <X className='h-2 w-2 ml-1' />
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Zweiter Turniertag */}
                    <div className='border border-slate-200 rounded-lg p-4'>
                      <div className='flex items-center gap-2 mb-4'>
                        <div className='w-3 h-3 bg-green-500 rounded-full'></div>
                        <Label className='font-medium text-slate-800'>
                          {tag2} - {new Date(turnierEinstellungen.turnierEndDatum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </Label>
                      </div>
                      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4'>
                        {feldEinstellungen.map(feld => {
                          const jahrgaengeTag2 =
                            feld.erlaubteJahrgaengeProTag[turnierEinstellungen.turnierEndDatum] || []
                          return (
                            <div
                              key={`${feld.id}-tag2`}
                              className='p-3 border border-slate-100 rounded-lg bg-slate-50'
                            >
                              <div className='text-sm font-medium text-slate-700 mb-2'>
                                {feld.name}
                              </div>

                              {/* Jahrgang hinzufügen */}
                              <Select
                                onValueChange={value =>
                                  addJahrgangToFeldProTag(
                                    feld.id,
                                    turnierEinstellungen.turnierEndDatum,
                                    value
                                  )
                                }
                              >
                                <SelectTrigger className='h-7 text-xs mb-2'>
                                  <SelectValue placeholder='Jahrgang...' />
                                </SelectTrigger>
                                <SelectContent>
                                  {VERFÜGBARE_JAHRGÄNGE.filter(
                                    jahrgang =>
                                      !jahrgaengeTag2.includes(jahrgang)
                                  ).map(jahrgang => (
                                    <SelectItem key={jahrgang} value={jahrgang}>
                                      {jahrgang}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Zugewiesene Jahrgänge */}
                              <div className='flex flex-wrap gap-1'>
                                {jahrgaengeTag2.length === 0 ? (
                                  <span className='text-xs text-slate-500 italic'>
                                    Standard-Einstellungen
                                  </span>
                                ) : (
                                  jahrgaengeTag2.map(jahrgang => (
                                    <Badge
                                      key={jahrgang}
                                      variant='secondary'
                                      className='text-xs px-1 py-0.5 bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer'
                                      onClick={() =>
                                        removeJahrgangFromFeldProTag(
                                          feld.id,
                                          turnierEinstellungen.turnierEndDatum,
                                          jahrgang
                                        )
                                      }
                                    >
                                      {jahrgang.length > 6
                                        ? jahrgang.substring(0, 6) + '...'
                                        : jahrgang}
                                      <X className='h-2 w-2 ml-1' />
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spielplan-Grid */}
              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-4 sm:pb-6 border-b border-slate-100'>
                  <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-blue-100 rounded-lg'>
                        <CalendarIcon className='h-4 w-4 sm:h-5 sm:w-5 text-blue-600' />
                      </div>
                      <div>
                        <CardTitle className='text-lg sm:text-xl text-slate-800'>
                          Spielplan-Übersicht
                        </CardTitle>
                        <CardDescription className='text-slate-600 hidden sm:block'>
                          Spiele per Drag & Drop verschieben und organisieren
                        </CardDescription>
                      </div>
                    </div>
                    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <Badge
                          variant='outline'
                          className='bg-slate-50 text-slate-700 border-slate-200 text-xs sm:text-sm'
                        >
                          {spiele.length} Spiele
                        </Badge>
                        <Badge
                          variant='outline'
                          className='bg-purple-50 text-purple-700 border-purple-200 text-xs sm:text-sm'
                        >
                          <Clock className='h-3 w-3 mr-1' />
                          <span className='hidden sm:inline'>
                            {(() => {
                              if (
                                selectedDate ===
                                  turnierEinstellungen.turnierStartDatum ||
                                selectedDate === '2025-07-05'
                              ) {
                                return `${
                                  turnierEinstellungen.samstagStartzeit || '09:00'
                                } - ${
                                  turnierEinstellungen.samstagEndzeit || '18:00'
                                }`
                              } else if (
                                selectedDate ===
                                  turnierEinstellungen.turnierEndDatum ||
                                selectedDate === '2025-07-06'
                              ) {
                                return `${
                                  turnierEinstellungen.sonntagStartzeit || '09:00'
                                } - ${
                                  turnierEinstellungen.sonntagEndzeit || '18:00'
                                }`
                              }
                              return '09:00 - 18:00'
                            })()}
                          </span>
                          <span className='sm:hidden'>Zeit</span>
                        </Badge>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          debugSpiele()
                          loadSpielplan()
                        }}
                        className='text-slate-600 hover:text-slate-700 w-full sm:w-auto'
                      >
                        <RefreshCw className='h-4 w-4 mr-1 sm:mr-2' />
                        <span className='hidden sm:inline'>Aktualisieren</span>
                        <span className='sm:hidden'>Update</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-4 sm:p-6'>
                  <div className='space-y-4 sm:space-y-6'>
                    {/* Datums-Auswahl */}
                    <div className='flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4'>
                      {/* Zeige alle verfügbaren Spiel-Daten als Buttons */}
                      {spiele.length > 0 ? (
                        [...new Set(spiele.map(s => s.datum))]
                          .sort()
                          .map(datum => (
                            <Button
                              key={datum}
                              variant={
                                selectedDate === datum ? 'default' : 'outline'
                              }
                              onClick={() => {
                                console.log(`📅 Wechsle zu Datum: ${datum}`)
                                setSelectedDate(datum)
                              }}
                              className={`px-3 sm:px-6 py-2 transition-all duration-200 w-full sm:w-auto ${
                                selectedDate === datum
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <CalendarIcon className='h-4 w-4 mr-1 sm:mr-2' />
                              <span className='text-sm sm:text-base'>
                                {formatTurnierDate(datum)}
                              </span>
                              <Badge
                                variant='outline'
                                className='ml-1 sm:ml-2 bg-white/20 text-current border-current/30 text-xs'
                              >
                                {spiele.filter(s => s.datum === datum).length}
                              </Badge>
                            </Button>
                          ))
                      ) : (
                        /* Fallback: Zeige Turnier-Daten wenn keine Spiele vorhanden */
                        <>
                          <Button
                            variant={
                              selectedDate ===
                              turnierEinstellungen.turnierStartDatum
                                ? 'default'
                                : 'outline'
                            }
                            onClick={() =>
                              setSelectedDate(
                                turnierEinstellungen.turnierStartDatum
                              )
                            }
                            className={`px-3 sm:px-6 py-2 transition-all duration-200 w-full sm:w-auto ${
                              selectedDate ===
                              turnierEinstellungen.turnierStartDatum
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <CalendarIcon className='h-4 w-4 mr-1 sm:mr-2' />
                            <span className='text-sm sm:text-base'>
                              {formatTurnierDate(
                                turnierEinstellungen.turnierStartDatum
                              )}
                            </span>
                          </Button>
                          <Button
                            variant={
                              selectedDate ===
                              turnierEinstellungen.turnierEndDatum
                                ? 'default'
                                : 'outline'
                            }
                            onClick={() =>
                              setSelectedDate(
                                turnierEinstellungen.turnierEndDatum
                              )
                            }
                            className={`px-3 sm:px-6 py-2 transition-all duration-200 w-full sm:w-auto ${
                              selectedDate ===
                              turnierEinstellungen.turnierEndDatum
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <CalendarIcon className='h-4 w-4 mr-1 sm:mr-2' />
                            <span className='text-sm sm:text-base'>
                              {formatTurnierDate(
                                turnierEinstellungen.turnierEndDatum
                              )}
                            </span>
                          </Button>
                        </>
                      )}
                    </div>

                    <div className='overflow-x-auto'>
                      <div className='min-w-full'>
                        {/* Mobile optimierte Ansicht */}
                        <div className='block sm:hidden'>
                          {feldEinstellungen
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((feld, index) => {
                              const feldColors = [
                                'bg-blue-50 border-blue-200',
                                'bg-emerald-50 border-emerald-200',
                                'bg-purple-50 border-purple-200',
                                'bg-amber-50 border-amber-200',
                                'bg-rose-50 border-rose-200'
                              ]
                              const colorClass =
                                feldColors[index % feldColors.length] ||
                                'bg-slate-50 border-slate-200'

                              return (
                                <div key={feld.id} className='mb-6'>
                                  <div className={`p-3 rounded-lg border ${colorClass} mb-3`}>
                                    <div className='font-medium text-slate-700 text-center mb-2'>
                                      {feld.name}
                                    </div>
                                    <div className='text-xs text-slate-500 text-center mb-2'>
                                      {feld.spielzeit}min
                                      {feld.zweiHalbzeiten &&
                                        ` (2x${feld.spielzeit / 2}min)`}
                                    </div>
                                    <div className='text-center'>
                                      <div className='text-xs text-slate-600 mb-1 font-medium'>
                                        Jahrgänge:
                                      </div>
                                      <div className='flex flex-wrap gap-1 justify-center'>
                                        {(() => {
                                          const tagSpezifischeJahrgaenge = 
                                            feld.erlaubteJahrgaengeProTag?.[selectedDate] || []
                                          
                                          if (tagSpezifischeJahrgaenge.length > 0) {
                                            return tagSpezifischeJahrgaenge.map(jahrgang => (
                                              <Badge
                                                key={jahrgang}
                                                variant='secondary'
                                                className='text-xs px-1 py-0.5 bg-orange-100 text-orange-800'
                                              >
                                                {jahrgang.length > 6
                                                  ? jahrgang.substring(0, 6) + '...'
                                                  : jahrgang}
                                              </Badge>
                                            ))
                                          }
                                          
                                          if (feld.erlaubteJahrgaenge.length === 0) {
                                            return (
                                              <span className='text-xs text-slate-500 italic'>
                                                Alle Jahrgänge
                                              </span>
                                            )
                                          } else {
                                            return feld.erlaubteJahrgaenge.map(jahrgang => (
                                              <Badge
                                                key={jahrgang}
                                                variant='secondary'
                                                className='text-xs px-1 py-0.5 bg-orange-100 text-orange-800'
                                              >
                                                {jahrgang.length > 6
                                                  ? jahrgang.substring(0, 6) + '...'
                                                  : jahrgang}
                                              </Badge>
                                            ))
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Mobile Spiele-Liste für dieses Feld */}
                                  <div className='space-y-2'>
                                    {(() => {
                                      const spieleForSelectedDate = spiele.filter(
                                        s => s.datum === selectedDate && s.feld === feld.name
                                      )
                                      const verfügbareZeiten = [
                                        ...new Set(
                                          spieleForSelectedDate.map(s => s.zeit)
                                        )
                                      ].sort()

                                      if (verfügbareZeiten.length === 0) {
                                        return (
                                          <div className='text-center py-4 text-slate-500 text-sm'>
                                            Keine Spiele für dieses Feld
                                          </div>
                                        )
                                      }

                                      return verfügbareZeiten.map(zeit => {
                                        const spiel = getSpielForSlot(
                                          feld.name,
                                          zeit,
                                          selectedDate
                                        )
                                        
                                        return (
                                          <div key={zeit} className='flex items-center gap-3'>
                                            <div className='text-sm text-slate-600 font-mono min-w-[50px]'>
                                              {zeit}
                                            </div>
                                            <div className='flex-1'>
                                              {spiel ? (
                                                <div className='bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-md'>
                                                  <div className='text-xs font-medium mb-1'>
                                                    {spiel.kategorie}
                                                  </div>
                                                  <div className='text-sm'>
                                                    {spiel.team1} vs {spiel.team2}
                                                  </div>
                                                  <div className='text-xs opacity-75 mt-1'>
                                                    {spiel.status}
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className='border-2 border-dashed border-slate-200 rounded-md p-3 text-center text-xs text-slate-400'>
                                                  Frei
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })
                                    })()}
                                  </div>
                                </div>
                              )
                            })}
                        </div>

                        {/* Desktop Grid-Ansicht */}
                        <div className='hidden sm:block'>
                          <div className='grid grid-cols-6 gap-2 mb-4'>
                            <div className='font-medium text-slate-700 text-sm p-2'>
                              Zeit
                            </div>
                            {feldEinstellungen
                              .sort((a, b) => a.name.localeCompare(b.name)) // Sortiere Felder alphabetisch
                              .map((feld, index) => {
                                // Definiere verschiedene Hintergrundfarben für jedes Feld
                                const feldColors = [
                                  'bg-blue-50 border-blue-200', // Feld 1 - Blau
                                  'bg-emerald-50 border-emerald-200', // Feld 2 - Grün
                                  'bg-purple-50 border-purple-200', // Feld 3 - Lila
                                  'bg-amber-50 border-amber-200', // Feld 4 - Amber
                                  'bg-rose-50 border-rose-200' // Feld 5 - Rosa
                                ]
                                const colorClass =
                                  feldColors[index % feldColors.length] ||
                                  'bg-slate-50 border-slate-200'

                                return (
                                  <div
                                    key={feld.id}
                                    className='text-center space-y-2'
                                  >
                                    <div
                                      className={`font-medium text-slate-700 text-sm p-2 rounded-lg border ${colorClass}`}
                                    >
                                      {feld.name}
                                    </div>
                                    <div className='text-xs text-slate-500'>
                                      {feld.spielzeit}min
                                      {feld.zweiHalbzeiten &&
                                        ` (2x${feld.spielzeit / 2}min)`}
                                    </div>

                                    {/* Zugewiesene Jahrgänge anzeigen (tag-spezifisch) */}
                                    <div className='mt-2'>
                                      <div className='text-xs text-slate-600 mb-2 font-medium text-center'>
                                        Jahrgänge:
                                      </div>
                                      <div className='flex flex-wrap gap-1 justify-center'>
                                        {(() => {
                                          // Hole tag-spezifische Jahrgänge für das ausgewählte Datum
                                          const tagSpezifischeJahrgaenge = 
                                            feld.erlaubteJahrgaengeProTag?.[selectedDate] || []
                                          
                                          // Wenn tag-spezifische Einstellungen vorhanden sind, verwende diese
                                          if (tagSpezifischeJahrgaenge.length > 0) {
                                            return tagSpezifischeJahrgaenge.map(jahrgang => (
                                              <Badge
                                                key={jahrgang}
                                                variant='secondary'
                                                className='text-xs px-1 py-0.5 bg-orange-100 text-orange-800'
                                                title={`Tag-spezifisch für ${selectedDate}`}
                                              >
                                                {jahrgang.length > 8
                                                  ? jahrgang.substring(0, 8) + '...'
                                                  : jahrgang}
                                              </Badge>
                                            ))
                                          }
                                          
                                          // Fallback: Standard-Jahrgänge oder "Alle erlaubt"
                                          if (feld.erlaubteJahrgaenge.length === 0) {
                                            return (
                                              <span className='text-xs text-slate-500 italic'>
                                                Alle Jahrgänge erlaubt
                                              </span>
                                            )
                                          } else {
                                            return feld.erlaubteJahrgaenge.map(jahrgang => (
                                              <Badge
                                                key={jahrgang}
                                                variant='secondary'
                                                className='text-xs px-1 py-0.5 bg-orange-100 text-orange-800'
                                                title="Standard-Einstellung"
                                              >
                                                {jahrgang.length > 8
                                                  ? jahrgang.substring(0, 8) + '...'
                                                  : jahrgang}
                                              </Badge>
                                            ))
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                          </div>

                          {spiele.length === 0 ? (
                            /* Kein Spielplan - zeige Konfigurationshinweis */
                            <div className='text-center py-16 border-2 border-dashed border-slate-200 rounded-lg'>
                              <div className='p-4 bg-slate-100 rounded-full w-fit mx-auto mb-6'>
                                <CalendarIcon className='h-12 w-12 text-slate-400' />
                              </div>
                              <p className='text-slate-700 text-lg mb-2'>
                                Noch kein Spielplan generiert
                              </p>
                              <p className='text-slate-500 text-sm mb-4'>
                                Konfigurieren Sie oben die Jahrgangs-Zuordnungen
                                für jedes Feld.
                                <br />
                                Klicken Sie dann auf "Spielplan generieren" um zu
                                beginnen.
                              </p>
                              <Button
                                className='bg-orange-500 hover:bg-orange-600 text-white font-medium px-6'
                                onClick={generateSpielplan}
                              >
                                <CalendarIcon className='h-4 w-4 mr-2' />
                                Spielplan generieren
                              </Button>
                            </div>
                          ) : (
                            /* Spielplan vorhanden - zeige Zeitslots */
                            <div className='space-y-2 max-h-96 overflow-y-auto'>
                              {(() => {
                                // Generiere Zeitslots basierend auf tatsächlichen Spielzeiten für das ausgewählte Datum
                                const spieleForSelectedDate = spiele.filter(
                                  s => s.datum === selectedDate
                                )
                                const verfügbareZeiten = [
                                  ...new Set(
                                    spieleForSelectedDate.map(s => s.zeit)
                                  )
                                ].sort()

                                // Wenn keine Spiele für das ausgewählte Datum: zeige trotzdem Standard-Zeitslots
                                const alleZeitslots =
                                  verfügbareZeiten.length > 0
                                    ? verfügbareZeiten
                                    : generateTimeSlots()

                                console.log(
                                  `🎯 Zeige Zeitslots für ${selectedDate}:`,
                                  alleZeitslots.length
                                )
                                console.log(
                                  `📋 Spiele für dieses Datum:`,
                                  spieleForSelectedDate.length
                                )
                                console.log(
                                  `⏰ Verfügbare Zeiten:`,
                                  verfügbareZeiten
                                )

                                return alleZeitslots.map(zeit => (
                                  <div
                                    key={zeit}
                                    className='grid grid-cols-6 gap-2'
                                  >
                                    <div className='text-sm text-slate-600 p-2 font-mono'>
                                      {zeit}
                                    </div>
                                    {feldEinstellungen
                                      .sort((a, b) =>
                                        a.name.localeCompare(b.name)
                                      ) // Sortiere Felder alphabetisch
                                      .map((feld, index) => {
                                        // Verwende dieselben Farben wie im Header
                                        const feldColors = [
                                          'bg-blue-50 border-blue-200', // Feld 1 - Blau
                                          'bg-emerald-50 border-emerald-200', // Feld 2 - Grün
                                          'bg-purple-50 border-purple-200', // Feld 3 - Lila
                                          'bg-amber-50 border-amber-200', // Feld 4 - Amber
                                          'bg-rose-50 border-rose-200' // Feld 5 - Rosa
                                        ]
                                        const colorClass =
                                          feldColors[index % feldColors.length] ||
                                          'bg-slate-50 border-slate-200'

                                        const spiel = getSpielForSlot(
                                          feld.name,
                                          zeit,
                                          selectedDate
                                        )

                                        return (
                                          <div
                                            key={`${feld.id}-${zeit}-${selectedDate}`}
                                            className={`min-h-[60px] border-2 border-dashed rounded-lg p-2 transition-all duration-200 hover:border-slate-300 ${colorClass}`}
                                            onDragOver={handleDragOver}
                                            onDrop={e =>
                                              handleDrop(
                                                e,
                                                feld.name,
                                                zeit,
                                                selectedDate
                                              )
                                            }
                                          >
                                            {spiel ? (
                                              <div className='relative group'>
                                                <div
                                                  draggable
                                                  onDragStart={e =>
                                                    handleDragStart(e, spiel)
                                                  }
                                                  className='bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 rounded-md cursor-move shadow-sm hover:shadow-md transition-all duration-200'
                                                >
                                                  <div className='text-xs font-medium mb-1'>
                                                    {spiel.kategorie}
                                                  </div>
                                                  <div className='text-xs opacity-90'>
                                                    {spiel.team1} vs {spiel.team2}
                                                  </div>
                                                  <div className='text-xs opacity-75 mt-1'>
                                                    {spiel.status}
                                                  </div>
                                                </div>

                                                {/* Action Buttons - erscheinen bei Hover */}
                                                <div className='absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1'>
                                                  <button
                                                    onClick={e => {
                                                      e.stopPropagation()
                                                      setEditingSpiel(spiel)
                                                      setShowSpielDialog(true)
                                                    }}
                                                    className='bg-white/20 hover:bg-white/30 text-white p-1 rounded-sm transition-colors'
                                                    title='Bearbeiten'
                                                  >
                                                    <Edit className='h-3 w-3' />
                                                  </button>
                                                  <button
                                                    onClick={e => {
                                                      e.stopPropagation()
                                                      deleteSpiel(spiel.id)
                                                    }}
                                                    className='bg-red-500/20 hover:bg-red-500/30 text-white p-1 rounded-sm transition-colors'
                                                    title='Löschen'
                                                  >
                                                    <Trash2 className='h-3 w-3' />
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className='text-xs text-slate-400 text-center py-4'>
                                                Frei
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                  </div>
                                ))
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spiel-Bearbeitungs-Dialog */}
              {showSpielDialog && editingSpiel && (
                <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
                  <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4'>
                    <div className='flex items-center justify-between p-6 border-b border-slate-200'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Spiel bearbeiten
                      </h3>
                      <button
                        onClick={() => {
                          setShowSpielDialog(false)
                          setEditingSpiel(null)
                        }}
                        className='text-slate-400 hover:text-slate-600 transition-colors'
                      >
                        <X className='h-5 w-5' />
                      </button>
                    </div>

                    <div className='p-6 space-y-4'>
                      <div className='grid grid-cols-2 gap-4 text-sm'>
                        <div>
                          <span className='text-slate-600'>Feld:</span>
                          <span className='ml-2 font-medium'>
                            {editingSpiel.feld}
                          </span>
                        </div>
                        <div>
                          <span className='text-slate-600'>Zeit:</span>
                          <span className='ml-2 font-medium'>
                            {editingSpiel.zeit}
                          </span>
                        </div>
                        <div>
                          <span className='text-slate-600'>Kategorie:</span>
                          <span className='ml-2 font-medium'>
                            {editingSpiel.kategorie}
                          </span>
                        </div>
                        <div>
                          <span className='text-slate-600'>Status:</span>
                          <span className='ml-2 font-medium'>
                            {editingSpiel.status}
                          </span>
                        </div>
                      </div>

                      <div className='space-y-3'>
                        <div>
                          <Label className='text-sm font-medium text-slate-700'>
                            Team 1
                          </Label>
                          <Select
                            value={editingSpiel.team1}
                            onValueChange={value =>
                              setEditingSpiel({ ...editingSpiel, team1: value })
                            }
                          >
                            <SelectTrigger className='w-full mt-1'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAllTeamNames().map(teamName => (
                                <SelectItem key={teamName} value={teamName}>
                                  {teamName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className='text-sm font-medium text-slate-700'>
                            Team 2
                          </Label>
                          <Select
                            value={editingSpiel.team2}
                            onValueChange={value =>
                              setEditingSpiel({ ...editingSpiel, team2: value })
                            }
                          >
                            <SelectTrigger className='w-full mt-1'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAllTeamNames().map(teamName => (
                                <SelectItem key={teamName} value={teamName}>
                                  {teamName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center justify-end gap-3 p-6 border-t border-slate-200'>
                      <Button
                        variant='outline'
                        onClick={() => {
                          setShowSpielDialog(false)
                          setEditingSpiel(null)
                        }}
                        className='border-slate-300 text-slate-600'
                      >
                        Abbrechen
                      </Button>
                      <Button
                        onClick={() =>
                          updateSpielTeams(
                            editingSpiel.id,
                            editingSpiel.team1,
                            editingSpiel.team2
                          )
                        }
                        className='bg-blue-600 hover:bg-blue-700 text-white'
                      >
                        Speichern
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistiken */}
              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-6 border-b border-slate-100'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-amber-100 rounded-lg'>
                      <Activity className='h-5 w-5 text-amber-600' />
                    </div>
                    <div>
                      <CardTitle className='text-xl text-slate-800'>
                        Spielplan-Statistiken
                      </CardTitle>
                      <CardDescription className='text-slate-600'>
                        Übersicht über die Spielverteilung
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-6'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div className='text-center p-4 bg-slate-50 rounded-lg'>
                      <div className='text-2xl font-bold text-slate-800'>
                        {spiele.length}
                      </div>
                      <div className='text-sm text-slate-600'>
                        Spiele gesamt
                      </div>
                    </div>
                    <div className='text-center p-4 bg-slate-50 rounded-lg'>
                      <div className='text-2xl font-bold text-slate-800'>
                        {new Set(spiele.map(s => s.kategorie)).size}
                      </div>
                      <div className='text-sm text-slate-600'>Kategorien</div>
                    </div>
                    <div className='text-center p-4 bg-slate-50 rounded-lg'>
                      <div className='text-2xl font-bold text-slate-800'>
                        {new Set(spiele.map(s => s.feld)).size}
                      </div>
                      <div className='text-sm text-slate-600'>
                        Felder in Nutzung
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Personal Tab */}
          <TabsContent value='helfer' className='mt-8'>
            <div className='space-y-6'>
              {/* Helfer-Zeitplan Tabelle */}
              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-4 sm:pb-6 border-b border-slate-100'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-purple-100 rounded-lg'>
                        <Shield className='h-4 w-4 sm:h-5 sm:w-5 text-purple-600' />
                      </div>
                      <div>
                        <CardTitle className='text-lg sm:text-xl text-slate-800'>
                          Helfer-Zeitplan
                        </CardTitle>
                        <CardDescription className='text-sm sm:text-base text-slate-600'>
                          <span className="hidden sm:inline">Drag & Drop Zeitplan für Helfer-Einsätze</span>
                          <span className="sm:hidden">Helfer-Einsätze verwalten</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setHelferDebugAction('demo')
                          setShowHelferDebugDialog(true)
                        }}
                        className='border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-xs sm:text-sm'
                      >
                        <Shield className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                        <span className="hidden sm:inline">Demo-Daten</span>
                        <span className="sm:hidden">Demo</span>
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setHelferDebugAction('flush')
                          setShowHelferDebugDialog(true)
                        }}
                        className='border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs sm:text-sm'
                      >
                        <Trash2 className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                        <span className="hidden sm:inline">DB leeren</span>
                        <span className="sm:hidden">Leeren</span>
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => {
                          setEditingHelferBedarf(null)
                          setShowHelferDialog(true)
                        }}
                        size="sm"
                        className="text-xs sm:text-sm"
                      >
                        <Plus className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                        <span className="hidden sm:inline">Neuen Bedarf hinzufügen</span>
                        <span className="sm:hidden">Hinzufügen</span>
                      </Button>
                      <Button
                        onClick={generateHelferLink}
                        className='bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm'
                        size="sm"
                      >
                        <RefreshCw className='h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2' />
                        <span className="hidden sm:inline">Anmeldelink generieren</span>
                        <span className="sm:hidden">Link</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-3 sm:p-6'>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                    {[...new Set(helferBedarf.map(b => b.datum))].sort().map(datum => (
                      <div key={datum} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                          <h3 className="font-semibold text-slate-800 text-sm">
                            {formatTurnierDate(datum)}
                          </h3>
                        </div>
                        <div className="p-3 space-y-3">
                          {generateHelferTimeSlots().map(zeitslot => {
                            const bedarfeInSlot = helferBedarf.filter(
                              bedarf =>
                                bedarf.datum === datum &&
                                isTimeInRange(zeitslot, bedarf.startzeit, bedarf.endzeit)
                            );
                            
                            if (bedarfeInSlot.length === 0) return null;
                            
                            return (
                              <div key={zeitslot} className="border border-slate-100 rounded-md">
                                <div className="bg-slate-25 px-2 py-1 border-b border-slate-100">
                                  <span className="text-xs font-medium text-slate-600">{zeitslot}</span>
                                </div>
                                <div className="p-2 space-y-2">
                                  {bedarfeInSlot.map(bedarf => (
                                    <div
                                      key={bedarf.id}
                                      className={`
                                        p-2 rounded-lg border-l-4 shadow-sm
                                        ${
                                          bedarf.kategorie === 'getraenke'
                                            ? 'bg-blue-50 border-blue-400 text-blue-800'
                                            : bedarf.kategorie === 'kaffee_kuchen'
                                            ? 'bg-orange-50 border-orange-400 text-orange-800'
                                            : bedarf.kategorie === 'grill'
                                            ? 'bg-red-50 border-red-400 text-red-800'
                                            : bedarf.kategorie === 'waffeln_suess'
                                            ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                                            : bedarf.kategorie === 'aufbau'
                                            ? 'bg-green-50 border-green-400 text-green-800'
                                            : 'bg-gray-50 border-gray-400 text-gray-800'
                                        }
                                      `}
                                    >
                                      <div className='flex items-start justify-between text-xs mb-2'>
                                        <span className='font-medium flex-1'>
                                          {bedarf.kategorie === 'getraenke' && '🥤'}
                                          {bedarf.kategorie === 'kaffee_kuchen' && '☕'}
                                          {bedarf.kategorie === 'grill' && '🍖'}
                                          {bedarf.kategorie === 'waffeln_suess' && '🧇'}
                                          {bedarf.kategorie === 'aufbau' && '🔧'}
                                          {bedarf.kategorie === 'sonstiges' && '📋'}
                                          {bedarf.titel}
                                        </span>
                                        <div className='flex items-center gap-1 ml-2'>
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={e => {
                                              e.stopPropagation()
                                              setEditingHelferBedarf(bedarf)
                                              setShowHelferDialog(true)
                                            }}
                                            className='h-6 w-6 p-0 hover:bg-white/50'
                                          >
                                            <Edit className='h-3 w-3' />
                                          </Button>
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={e => {
                                              e.stopPropagation()
                                              deleteHelferBedarf(bedarf.id)
                                            }}
                                            className='h-6 w-6 p-0 hover:bg-white/50 text-red-500'
                                          >
                                            <Trash2 className='h-3 w-3' />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className='text-xs opacity-75 mb-1'>
                                        {bedarf.startzeit} - {bedarf.endzeit} | {bedarf.anzahlBenötigt} Helfer
                                      </div>
                                      <div className='text-xs opacity-60'>
                                        {getHelferAnmeldungenForBedarf(bedarf.id).length} / {bedarf.anzahlBenötigt} angemeldet
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className='w-full border-collapse border border-slate-300'>
                      <thead>
                        <tr className='bg-slate-50'>
                          <th className='border border-slate-300 p-3 text-left font-semibold text-slate-700'>
                            Zeit / Datum
                          </th>
                          {[...new Set(helferBedarf.map(b => b.datum))]
                            .sort()
                            .map(datum => (
                              <th
                                key={datum}
                                className='border border-slate-300 p-3 text-center font-semibold text-slate-700 min-w-[200px]'
                              >
                                {formatTurnierDate(datum)}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {generateHelferTimeSlots().map(zeitslot => (
                          <tr key={zeitslot} className='hover:bg-slate-50'>
                            <td className='border border-slate-300 p-3 font-medium text-slate-600 bg-slate-50'>
                              {zeitslot}
                            </td>
                            {[...new Set(helferBedarf.map(b => b.datum))]
                              .sort()
                              .map(datum => (
                                <td
                                  key={`${datum}-${zeitslot}`}
                                  className='border border-slate-300 p-2 min-h-[80px] relative'
                                  onDragOver={handleHelferDragOver}
                                  onDrop={e =>
                                    handleHelferDrop(e, datum, zeitslot)
                                  }
                                >
                                  {helferBedarf
                                    .filter(
                                      bedarf =>
                                        bedarf.datum === datum &&
                                        isTimeInRange(
                                          zeitslot,
                                          bedarf.startzeit,
                                          bedarf.endzeit
                                        )
                                    )
                                    .map(bedarf => (
                                      <div
                                        key={bedarf.id}
                                        draggable
                                        onDragStart={e =>
                                          handleHelferDragStart(e, bedarf)
                                        }
                                        className={`
                                        mb-1 p-2 rounded-lg cursor-move border-l-4 shadow-sm
                                        ${
                                          bedarf.kategorie === 'getraenke'
                                            ? 'bg-blue-50 border-blue-400 text-blue-800'
                                            : bedarf.kategorie ===
                                              'kaffee_kuchen'
                                            ? 'bg-orange-50 border-orange-400 text-orange-800'
                                            : bedarf.kategorie === 'grill'
                                            ? 'bg-red-50 border-red-400 text-red-800'
                                            : bedarf.kategorie ===
                                              'waffeln_suess'
                                            ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                                            : bedarf.kategorie === 'aufbau'
                                            ? 'bg-green-50 border-green-400 text-green-800'
                                            : 'bg-gray-50 border-gray-400 text-gray-800'
                                        }
                                      `}
                                      >
                                        <div className='flex items-center justify-between text-xs'>
                                          <span className='font-medium'>
                                            {bedarf.kategorie === 'getraenke' &&
                                              '🥤'}
                                            {bedarf.kategorie ===
                                              'kaffee_kuchen' && '☕'}
                                            {bedarf.kategorie === 'grill' &&
                                              '🍖'}
                                            {bedarf.kategorie ===
                                              'waffeln_suess' && '🧇'}
                                            {bedarf.kategorie === 'aufbau' &&
                                              '🔧'}
                                            {bedarf.kategorie === 'sonstiges' &&
                                              '📋'}
                                            {bedarf.titel}
                                          </span>
                                          <div className='flex items-center gap-1'>
                                            <Button
                                              variant='ghost'
                                              size='sm'
                                              onClick={e => {
                                                e.stopPropagation()
                                                setEditingHelferBedarf(bedarf)
                                                setShowHelferDialog(true)
                                              }}
                                              className='h-6 w-6 p-0 hover:bg-white/50'
                                            >
                                              <Edit className='h-3 w-3' />
                                            </Button>
                                            <Button
                                              variant='ghost'
                                              size='sm'
                                              onClick={e => {
                                                e.stopPropagation()
                                                deleteHelferBedarf(bedarf.id)
                                              }}
                                              className='h-6 w-6 p-0 hover:bg-white/50 text-red-500'
                                            >
                                              <Trash2 className='h-3 w-3' />
                                            </Button>
                                          </div>
                                        </div>
                                        <div className='text-xs opacity-75 mt-1'>
                                          {bedarf.startzeit} - {bedarf.endzeit}{' '}
                                          | {bedarf.anzahlBenötigt} Helfer
                                        </div>
                                        <div className='text-xs opacity-60'>
                                          {
                                            getHelferAnmeldungenForBedarf(
                                              bedarf.id
                                            ).length
                                          }{' '}
                                          / {bedarf.anzahlBenötigt} angemeldet
                                        </div>
                                      </div>
                                    ))}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Helfer-Link Generator */}
              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-4 sm:pb-6 border-b border-slate-100'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-indigo-100 rounded-lg'>
                      <MapPin className='h-4 w-4 sm:h-5 sm:w-5 text-indigo-600' />
                    </div>
                    <div>
                      <CardTitle className='text-lg sm:text-xl text-slate-800'>
                        Helfer-Anmeldelink
                      </CardTitle>
                      <CardDescription className='text-sm sm:text-base text-slate-600'>
                        Generieren Sie einen geheimen Link für Helfer-Anmeldungen
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-3 sm:p-6 space-y-3 sm:space-y-4'>
                  <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'>
                    {helferLink && (
                      <Button
                        variant='outline'
                        onClick={() => {
                          navigator.clipboard.writeText(helferLink)
                          alert('Link in Zwischenablage kopiert!')
                        }}
                        className='border-slate-300 text-slate-600 w-full sm:w-auto text-sm'
                      >
                        <Upload className='h-3 w-3 sm:h-4 sm:w-4 mr-2' />
                        Link kopieren
                      </Button>
                    )}
                  </div>
                  {helferLink && (
                    <div className='p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-lg'>
                      <p className='text-xs sm:text-sm text-indigo-700 mb-2 font-medium'>
                        Aktueller Helfer-Link:
                      </p>
                      <code className='block text-xs bg-white p-2 rounded border text-indigo-800 break-all'>
                        {helferLink}
                      </code>
                      <p className='text-xs text-indigo-600 mt-2'>
                        Teilen Sie diesen Link mit potentiellen Helfern. Sie können sich damit selbstständig für Aufgaben anmelden.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Helfer-Anmeldungen */}
              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-4 sm:pb-6 border-b border-slate-100'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-orange-100 rounded-lg'>
                        <Users className='h-4 w-4 sm:h-5 sm:w-5 text-orange-600' />
                      </div>
                      <div>
                        <CardTitle className='text-lg sm:text-xl text-gray-800'>
                          Helfer-Anmeldungen
                        </CardTitle>
                        <CardDescription className='text-sm sm:text-base text-slate-600'>
                          Übersicht aller angemeldeten Helfer
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      className='bg-slate-50 text-slate-700 border-slate-200 w-fit'
                    >
                      {helferAnmeldungen.length} Anmeldungen
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='p-3 sm:p-6'>
                  {helferAnmeldungen.length === 0 ? (
                    <div className='text-center py-12 sm:py-16'>
                      <div className='p-3 sm:p-4 bg-slate-100 rounded-full w-fit mx-auto mb-4 sm:mb-6'>
                        <Users className='h-8 w-8 sm:h-12 sm:w-12 text-slate-400' />
                      </div>
                      <p className='text-slate-700 text-base sm:text-lg mb-2'>
                        Noch keine Helfer-Anmeldungen
                      </p>
                      <p className='text-slate-500 text-xs sm:text-sm mb-4'>
                        Helfer erscheinen hier, sobald sie sich über den Link registrieren
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block lg:hidden space-y-3">
                        {helferAnmeldungen.map((anmeldung) => (
                          <Card key={anmeldung.id} className="border border-slate-200">
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-slate-800 text-sm truncate">
                                    {anmeldung.name}
                                  </h4>
                                  <p className="text-xs text-slate-600 truncate">
                                    {anmeldung.email}
                                  </p>
                                  {anmeldung.telefon && (
                                    <p className="text-xs text-slate-500">
                                      {anmeldung.telefon}
                                    </p>
                                  )}
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`
                                    text-xs ml-2 flex-shrink-0
                                    ${anmeldung.status === 'bestätigt' 
                                      ? 'bg-green-50 text-green-700 border-green-200' 
                                      : anmeldung.status === 'abgesagt'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }
                                  `}
                                >
                                  {anmeldung.status}
                                </Badge>
                              </div>
                              
                              {/* Aufgabe Info */}
                              {(() => {
                                const bedarf = helferBedarf.find(b => b.id === anmeldung.helferBedarfId);
                                return bedarf ? (
                                  <div className="mb-2 p-2 bg-slate-50 rounded text-xs">
                                    <div className="flex items-center gap-1 mb-1">
                                      <span>
                                        {bedarf.kategorie === 'getraenke' && '🥤'}
                                        {bedarf.kategorie === 'kaffee_kuchen' && '☕'}
                                        {bedarf.kategorie === 'grill' && '🍖'}
                                        {bedarf.kategorie === 'waffeln_suess' && '🧇'}
                                        {bedarf.kategorie === 'aufbau' && '🔧'}
                                        {bedarf.kategorie === 'sonstiges' && '📋'}
                                      </span>
                                      <span className="font-medium">{bedarf.titel}</span>
                                    </div>
                                    <div className="text-slate-600">
                                      {formatTurnierDate(bedarf.datum)} | {bedarf.startzeit} - {bedarf.endzeit}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                              
                              {/* Bemerkung und Kuchenspende */}
                              {(anmeldung.bemerkung || anmeldung.kuchenspende) && (
                                <div className="mb-2 space-y-1">
                                  {anmeldung.bemerkung && (
                                    <p className="text-xs text-slate-600">
                                      <span className="font-medium">Bemerkung:</span> {anmeldung.bemerkung}
                                    </p>
                                  )}
                                  {anmeldung.kuchenspende && (
                                    <p className="text-xs text-slate-600">
                                      <span className="font-medium">Kuchen:</span> {anmeldung.kuchenspende}
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateHelferStatus(anmeldung.id, 'bestätigt')}
                                  className="text-xs px-2 py-1 h-6 border-green-300 text-green-600 hover:bg-green-50"
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateHelferStatus(anmeldung.id, 'abgesagt')}
                                  className="text-xs px-2 py-1 h-6 border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  ✗
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteHelferAnmeldung(anmeldung.id)}
                                  className="text-xs px-2 py-1 h-6 border-gray-300 text-gray-600 hover:bg-gray-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Helfer-Bedarf Dialog */}
            {showHelferDialog && (
              <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
                <div className='bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto'>
                  <div className='flex items-center justify-between p-6 border-b border-slate-200'>
                    <h3 className='text-lg font-semibold text-slate-800'>
                      {editingHelferBedarf
                        ? 'Helfer-Bedarf bearbeiten'
                        : 'Neuen Helfer-Bedarf erstellen'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowHelferDialog(false)
                        setEditingHelferBedarf(null)
                      }}
                      className='text-slate-400 hover:text-slate-600 transition-colors'
                    >
                      <X className='h-5 w-5' />
                    </button>
                  </div>

                  <div className='p-6 space-y-4'>
                    <div className='grid grid-cols-1 gap-4'>
                      <div>
                        <Label className='text-sm font-medium text-slate-700'>
                          Titel
                        </Label>
                        <Input
                          value={editingHelferBedarf?.titel || ''}
                          onChange={e =>
                            setEditingHelferBedarf(prev =>
                              prev
                                ? { ...prev, titel: e.target.value }
                                : {
                                    id: '',
                                    titel: e.target.value,
                                    beschreibung: '',
                                    datum:
                                      turnierEinstellungen.turnierStartDatum,
                                    startzeit: '09:00',
                                    endzeit: '17:00',
                                    anzahlBenötigt: 1,
                                    kategorie: 'sonstiges',
                                    aktiv: true,
                                    created_at: new Date().toISOString()
                                  }
                            )
                          }
                          placeholder='z.B. Grillmeister'
                          className='mt-1'
                        />
                      </div>

                      <div>
                        <Label className='text-sm font-medium text-slate-700'>
                          Beschreibung
                        </Label>
                        <Textarea
                          value={editingHelferBedarf?.beschreibung || ''}
                          onChange={e =>
                            setEditingHelferBedarf(prev =>
                              prev
                                ? { ...prev, beschreibung: e.target.value }
                                : {
                                    id: '',
                                    titel: '',
                                    beschreibung: e.target.value,
                                    datum:
                                      turnierEinstellungen.turnierStartDatum,
                                    startzeit: '09:00',
                                    endzeit: '17:00',
                                    anzahlBenötigt: 1,
                                    kategorie: 'sonstiges',
                                    aktiv: true,
                                    created_at: new Date().toISOString()
                                  }
                            )
                          }
                          placeholder='Beschreibung der Aufgabe...'
                          className='mt-1'
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label className='text-sm font-medium text-slate-700'>
                          Kategorie
                        </Label>
                        <Select
                          value={editingHelferBedarf?.kategorie || 'sonstiges'}
                          onValueChange={(
                            value:
                              | 'getraenke'
                              | 'kaffee_kuchen'
                              | 'grill'
                              | 'waffeln_suess'
                              | 'aufbau'
                              | 'sonstiges'
                          ) =>
                            setEditingHelferBedarf(prev =>
                              prev
                                ? { ...prev, kategorie: value }
                                : {
                                    id: '',
                                    titel: '',
                                    beschreibung: '',
                                    datum:
                                      turnierEinstellungen.turnierStartDatum,
                                    startzeit: '09:00',
                                    endzeit: '17:00',
                                    anzahlBenötigt: 1,
                                    kategorie: value,
                                    aktiv: true,
                                    created_at: new Date().toISOString()
                                  }
                            )
                          }
                        >
                          <SelectTrigger className='mt-1'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='getraenke'>
                              🥤 Getränke
                            </SelectItem>
                            <SelectItem value='kaffee_kuchen'>
                              ☕ Kaffee & Kuchen
                            </SelectItem>
                            <SelectItem value='grill'>� Grill</SelectItem>
                            <SelectItem value='waffeln_suess'>
                              🧇 Waffeln & Süß
                            </SelectItem>
                            <SelectItem value='aufbau'>🔧 Aufbau</SelectItem>
                            <SelectItem value='sonstiges'>
                              📋 Sonstiges
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <Label className='text-sm font-medium text-slate-700'>
                            Datum
                          </Label>
                          <Select
                            value={
                              editingHelferBedarf?.datum ||
                              turnierEinstellungen.turnierStartDatum
                            }
                            onValueChange={value =>
                              setEditingHelferBedarf(prev =>
                                prev
                                  ? { ...prev, datum: value }
                                  : {
                                      id: '',
                                      titel: '',
                                      beschreibung: '',
                                      datum: value,
                                      startzeit: '09:00',
                                      endzeit: '17:00',
                                      anzahlBenötigt: 1,
                                      kategorie: 'sonstiges',
                                      aktiv: true,
                                      created_at: new Date().toISOString()
                                    }
                              )
                            }
                          >
                            <SelectTrigger className='mt-1'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value={turnierEinstellungen.turnierStartDatum}
                              >
                                {formatTurnierDate(
                                  turnierEinstellungen.turnierStartDatum
                                )}
                              </SelectItem>
                              <SelectItem
                                value={turnierEinstellungen.turnierEndDatum}
                              >
                                {formatTurnierDate(
                                  turnierEinstellungen.turnierEndDatum
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className='text-sm font-medium text-slate-700'>
                            Anzahl Helfer
                          </Label>
                          <Input
                            type='number'
                            min='1'
                            max='20'
                            value={editingHelferBedarf?.anzahlBenötigt || 1}
                            onChange={e =>
                              setEditingHelferBedarf(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      anzahlBenötigt: parseInt(e.target.value)
                                    }
                                  : {
                                      id: '',
                                      titel: '',
                                      beschreibung: '',
                                      datum:
                                        turnierEinstellungen.turnierStartDatum,
                                      startzeit: '09:00',
                                      endzeit: '17:00',
                                      anzahlBenötigt: parseInt(e.target.value),
                                      kategorie: 'sonstiges',
                                      aktiv: true,
                                      created_at: new Date().toISOString()
                                    }
                              )
                            }
                            className='mt-1'
                          />
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <Label className='text-sm font-medium text-slate-700'>
                            Startzeit
                          </Label>
                          <Input
                            type='time'
                            value={editingHelferBedarf?.startzeit || '09:00'}
                            onChange={e =>
                              setEditingHelferBedarf(prev =>
                                prev
                                  ? { ...prev, startzeit: e.target.value }
                                  : {
                                      id: '',
                                      titel: '',
                                      beschreibung: '',
                                      datum:
                                        turnierEinstellungen.turnierStartDatum,
                                      startzeit: e.target.value,
                                      endzeit: '17:00',
                                      anzahlBenötigt: 1,
                                      kategorie: 'sonstiges',
                                      aktiv: true,
                                      created_at: new Date().toISOString()
                                    }
                              )
                            }
                            className='mt-1'
                          />
                        </div>

                        <div>
                          <Label className='text-sm font-medium text-slate-700'>
                            Endzeit
                          </Label>
                          <Input
                            type='time'
                            value={editingHelferBedarf?.endzeit || '17:00'}
                            onChange={e =>
                              setEditingHelferBedarf(prev =>
                                prev
                                  ? { ...prev, endzeit: e.target.value }
                                  : {
                                      id: '',
                                      titel: '',
                                      beschreibung: '',
                                      datum:
                                        turnierEinstellungen.turnierStartDatum,
                                      startzeit: '09:00',
                                      endzeit: e.target.value,
                                      anzahlBenötigt: 1,
                                      kategorie: 'sonstiges',
                                      aktiv: true,
                                      created_at: new Date().toISOString()
                                    }
                              )
                            }
                            className='mt-1'
                          />
                        </div>
                      </div>

                      <div className='flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200'>
                        <div className='space-y-1'>
                          <Label className='text-slate-700 font-medium text-sm'>
                            Aktiv
                          </Label>
                          <p className='text-slate-500 text-xs'>
                            Nur aktive Positionen werden in der Helfer-Anmeldung
                            angezeigt
                          </p>
                        </div>
                        <Switch
                          checked={editingHelferBedarf?.aktiv ?? true}
                          onCheckedChange={checked =>
                            setEditingHelferBedarf(prev =>
                              prev
                                ? { ...prev, aktiv: checked }
                                : {
                                    id: '',
                                    titel: '',
                                    beschreibung: '',
                                    datum:
                                      turnierEinstellungen.turnierStartDatum,
                                    startzeit: '09:00',
                                    endzeit: '17:00',
                                    anzahlBenötigt: 1,
                                    kategorie: 'sonstiges',
                                    aktiv: checked,
                                    created_at: new Date().toISOString()
                                  }
                            )
                          }
                          className='data-[state=checked]:bg-purple-600'
                        />
                      </div>

                      {/* Angemeldete Helfer für diesen Zeitraum */}
                      {editingHelferBedarf?.id && (
                        <div className='space-y-3'>
                          <div className='flex items-center justify-between'>
                            <Label className='text-sm font-medium text-slate-700'>
                              Angemeldete Helfer
                            </Label>
                            <Badge
                              variant='outline'
                              className='bg-purple-50 text-purple-700 border-purple-200'
                            >
                              {
                                getHelferAnmeldungenForBedarf(
                                  editingHelferBedarf.id
                                ).length
                              }{' '}
                              / {editingHelferBedarf.anzahlBenötigt}
                            </Badge>
                          </div>

                          <div className='max-h-48 overflow-y-auto border border-slate-200 rounded-lg'>
                            {getHelferAnmeldungenForBedarf(
                              editingHelferBedarf.id
                            ).length === 0 ? (
                              <div className='p-4 text-center text-slate-500 text-sm'>
                                <Users className='h-8 w-8 mx-auto text-slate-400 mb-2' />
                                Noch keine Helfer angemeldet
                              </div>
                            ) : (
                              <div className='divide-y divide-slate-100'>
                                {getHelferAnmeldungenForBedarf(
                                  editingHelferBedarf.id
                                ).map(anmeldung => (
                                  <div
                                    key={anmeldung.id}
                                    className='p-3 hover:bg-slate-50 transition-colors'
                                  >
                                    <div className='flex items-center justify-between'>
                                      <div className='flex-1'>
                                        <div className='flex items-center gap-2'>
                                          <p className='font-medium text-slate-800 text-sm'>
                                            {anmeldung.name}
                                          </p>
                                          <Badge
                                            variant={
                                              anmeldung.status === 'bestätigt'
                                                ? 'default'
                                                : anmeldung.status ===
                                                  'abgesagt'
                                                ? 'destructive'
                                                : 'secondary'
                                            }
                                            className={
                                              anmeldung.status === 'bestätigt'
                                                ? 'bg-orange-100 text-orange-700'
                                                : anmeldung.status ===
                                                  'abgesagt'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }
                                          >
                                            {anmeldung.status === 'angemeldet'
                                              ? 'Angemeldet'
                                              : anmeldung.status === 'bestätigt'
                                              ? 'Bestätigt'
                                              : 'Abgesagt'}
                                          </Badge>
                                        </div>
                                        <div className='text-xs text-slate-500 mt-1 space-y-1'>
                                          <div className='flex items-center gap-1'>
                                            <Mail className='w-3 h-3' />
                                            {anmeldung.email}
                                          </div>
                                          {anmeldung.telefon && (
                                            <div className='flex items-center gap-1'>
                                              <Clock className='w-3 h-3' />
                                              {anmeldung.telefon}
                                            </div>
                                          )}
                                        </div>
                                        {anmeldung.bemerkung && (
                                          <p className='text-xs text-slate-600 mt-2 italic bg-slate-50 p-2 rounded'>
                                            "{anmeldung.bemerkung}"
                                          </p>
                                        )}
                                      </div>
                                      <div className='ml-3'>
                                        <Select
                                          value={anmeldung.status}
                                          onValueChange={value =>
                                            updateHelferStatus(
                                              anmeldung.id,
                                              value
                                            )
                                          }
                                        >
                                          <SelectTrigger className='w-32 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors h-7 text-xs'>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className='bg-white border-slate-200'>
                                            <SelectItem
                                              value='angemeldet'
                                              className='text-xs'
                                            >
                                              <div className='flex items-center gap-1'>
                                                <Clock className='w-3 h-3 text-amber-500' />
                                                Angemeldet
                                              </div>
                                            </SelectItem>
                                            <SelectItem
                                              value='bestätigt'
                                              className='text-xs'
                                            >
                                              <div className='flex items-center gap-1'>
                                                <CheckCircle className='w-3 h-3 text-emerald-500' />
                                                Bestätigt
                                              </div>
                                            </SelectItem>
                                            <SelectItem
                                              value='abgesagt'
                                              className='text-xs'
                                            >
                                              <div className='flex items-center gap-1'>
                                                <XCircle className='w-3 h-3 text-red-500' />
                                                Abgesagt
                                              </div>
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className='text-xs text-slate-500 bg-slate-50 p-2 rounded'>
                            <div className='flex items-center gap-1'>
                              <AlertCircle className='w-3 h-3' />
                              Zeitraum: {editingHelferBedarf.startzeit} -{' '}
                              {editingHelferBedarf.endzeit} Uhr
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='flex items-center justify-end gap-3 p-6 border-t border-slate-200'>
                    <Button
                      variant='outline'
                      onClick={() => {
                        setShowHelferDialog(false)
                        setEditingHelferBedarf(null)
                      }}
                      className='border-slate-300 text-slate-600'
                    >
                      Abbrechen
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingHelferBedarf) {
                          const { id, created_at, ...bedarfData } =
                            editingHelferBedarf
                          saveHelferBedarf(bedarfData)
                          setShowHelferDialog(false)
                          setEditingHelferBedarf(null)
                        }
                      }}
                      className='bg-purple-600 hover:bg-purple-700 text-white'
                      disabled={
                        !editingHelferBedarf?.titel ||
                        !editingHelferBedarf?.beschreibung
                      }
                    >
                      {editingHelferBedarf?.id ? 'Aktualisieren' : 'Erstellen'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Einstellungen Tab */}
          <TabsContent value='einstellungen' className='mt-8'>
            <div className='space-y-6'>
              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-6 border-b border-slate-100'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-orange-100 rounded-lg'>
                      <Settings className='h-5 w-5 text-orange-600' />
                    </div>
                    <div>
                      <CardTitle className='text-xl text-slate-800'>
                        Grundeinstellungen
                      </CardTitle>
                      <CardDescription className='text-slate-600'>
                        Basis-Konfiguration des Turniers
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-6 space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='turnierName'
                        className='text-slate-700 font-medium text-sm'
                      >
                        Turnier-Name
                      </Label>
                      <Input
                        id='turnierName'
                        value={turnierEinstellungen.turnierName}
                        onChange={e =>
                          updateSettings('turnierName', e.target.value)
                        }
                        className='bg-white border-slate-300 text-slate-700 focus:border-orange-400 focus:ring-orange-400/20'
                        placeholder='Name des Turniers'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='adminEmail'
                        className='text-slate-700 font-medium text-sm'
                      >
                        Administrator E-Mail
                      </Label>
                      <Input
                        id='adminEmail'
                        type='email'
                        value={turnierEinstellungen.adminEmail}
                        onChange={e =>
                          updateSettings('adminEmail', e.target.value)
                        }
                        className='bg-white border-slate-300 text-slate-700 focus:border-orange-400 focus:ring-orange-400/20'
                        placeholder='admin@domain.de'
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-6 border-b border-slate-100'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-orange-100 rounded-lg'>
                      <Euro className='h-5 w-5 text-orange-600' />
                    </div>
                    <div>
                      <CardTitle className='text-xl text-gray-800'>
                        Preise & Zahlungen
                      </CardTitle>
                      <CardDescription className='text-slate-600'>
                        Startgelder und Zahlungsoptionen konfigurieren
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-6 space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='startgeld'
                        className='text-slate-700 font-medium text-sm'
                      >
                        Startgeld pro Team
                      </Label>
                      <div className='relative'>
                        <Input
                          id='startgeld'
                          type='number'
                          value={turnierEinstellungen.startgeld}
                          onChange={e =>
                            updateSettings(
                              'startgeld',
                              parseInt(e.target.value)
                            )
                          }
                          className='bg-white border-slate-300 text-slate-700 focus:border-emerald-400 focus:ring-emerald-400/20 pr-8'
                          placeholder='25'
                        />
                        <span className='absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm'>
                          €
                        </span>
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='schiriGeld'
                        className='text-slate-700 font-medium text-sm'
                      >
                        Schiedsrichter-Gebühr
                      </Label>
                      <div className='relative'>
                        <Input
                          id='schiriGeld'
                          type='number'
                          value={turnierEinstellungen.schiriGeld}
                          onChange={e =>
                            updateSettings(
                              'schiriGeld',
                              parseInt(e.target.value)
                            )
                          }
                          className='bg-white border-slate-300 text-slate-700 focus:border-emerald-400 focus:ring-emerald-400/20 pr-8'
                          placeholder='20'
                        />
                        <span className='absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm'>
                          €
                        </span>
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='maxTeams'
                        className='text-slate-700 font-medium text-sm'
                      >
                        Max. Teams pro Kategorie
                      </Label>
                      <Input
                        id='maxTeams'
                        type='number'
                        value={turnierEinstellungen.maxTeamsProKategorie}
                        onChange={e =>
                          updateSettings(
                            'maxTeamsProKategorie',
                            parseInt(e.target.value)
                          )
                        }
                        className='bg-white border-slate-300 text-slate-700 focus:border-emerald-400 focus:ring-emerald-400/20'
                        placeholder='8'
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-6 border-b border-slate-100'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-orange-100 rounded-lg'>
                      <CalendarIcon className='h-5 w-5 text-orange-600' />
                    </div>
                    <div>
                      <CardTitle className='text-xl text-slate-800'>
                        Turnierdaten
                      </CardTitle>
                      <CardDescription className='text-slate-600'>
                        Legen Sie das Turnierwochenende fest
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-6 space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='space-y-3'>
                      <Label className='text-slate-700 font-medium text-sm'>
                        Turnier Startdatum
                      </Label>
                      <div className='border rounded-lg p-4 bg-white flex justify-center'>
                        <Calendar
                          mode='single'
                          selected={
                            turnierEinstellungen.turnierStartDatum
                              ? new Date(
                                  `${turnierEinstellungen.turnierStartDatum}T12:00:00`
                                )
                              : undefined
                          }
                          onSelect={async (date: Date | undefined) => {
                            if (date) {
                              // Setze die Zeit auf Mittag, um Probleme mit der Zeitzonenkonvertierung zu vermeiden
                              const localDate = new Date(date.getTime())
                              localDate.setHours(12, 0, 0, 0)
                              const dateString = localDate
                                .toISOString()
                                .split('T')[0]

                              // Lokalen State sofort aktualisieren
                              updateSettings('turnierStartDatum', dateString)

                              // Automatisch speichern
                              try {
                                const response = await fetch('/api/admin', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    action: 'save_settings',
                                    settings: {
                                      ...turnierEinstellungen,
                                      turnierStartDatum: dateString
                                    }
                                  })
                                })

                                if (!response.ok) {
                                  throw new Error(
                                    'Fehler beim Speichern des Startdatums'
                                  )
                                }

                                // Kurze Bestätigung anzeigen
                                const originalBadge =
                                  document.querySelector('.start-datum-badge')
                                if (originalBadge) {
                                  originalBadge.classList.add(
                                    'ring-2',
                                    'ring-green-400',
                                    'ring-opacity-75'
                                  )
                                  setTimeout(() => {
                                    originalBadge.classList.remove(
                                      'ring-2',
                                      'ring-green-400',
                                      'ring-opacity-75'
                                    )
                                  }, 2000)
                                }
                                console.log(
                                  'Startdatum automatisch gespeichert'
                                )
                              } catch (error) {
                                console.error(
                                  'Fehler beim automatischen Speichern des Startdatums:',
                                  error
                                )
                                alert(
                                  'Fehler beim Speichern des Startdatums. Bitte versuchen Sie es erneut.'
                                )
                              }
                            }
                          }}
                          className='w-full [--cell-size:3.5rem] [--day-size:2.5rem]'
                          styles={{
                            day_selected: { background: '#2563eb' }
                          }}
                        />
                      </div>
                      <div className='flex items-center justify-center'>
                        <Badge className='start-datum-badge bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 px-3 py-1.5 text-sm transition-all duration-300'>
                          <CalendarIcon className='h-3.5 w-3.5 mr-2' />
                          {formatTurnierDate(
                            turnierEinstellungen.turnierStartDatum
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className='space-y-3'>
                      <Label className='text-slate-700 font-medium text-sm'>
                        Turnier Enddatum
                      </Label>
                      <div className='border rounded-lg p-4 bg-white flex justify-center'>
                        <Calendar
                          mode='single'
                          selected={
                            turnierEinstellungen.turnierEndDatum
                              ? new Date(
                                  `${turnierEinstellungen.turnierEndDatum}T12:00:00`
                                )
                              : undefined
                          }
                          onSelect={async (date: Date | undefined) => {
                            if (date) {
                              // Setze die Zeit auf Mittag, um Probleme mit der Zeitzonenkonvertierung zu vermeiden
                              const localDate = new Date(date.getTime())
                              localDate.setHours(12, 0, 0, 0)
                              const dateString = localDate
                                .toISOString()
                                .split('T')[0]

                              // Lokalen State sofort aktualisieren
                              updateSettings('turnierEndDatum', dateString)

                              // Automatisch speichern
                              try {
                                const response = await fetch('/api/admin', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    action: 'save_settings',
                                    settings: {
                                      ...turnierEinstellungen,
                                      turnierEndDatum: dateString
                                    }
                                  })
                                })

                                if (!response.ok) {
                                  throw new Error(
                                    'Fehler beim Speichern des Enddatums'
                                  )
                                }

                                // Kurze Bestätigung anzeigen
                                const originalBadge =
                                  document.querySelector('.end-datum-badge')
                                if (originalBadge) {
                                  originalBadge.classList.add(
                                    'ring-2',
                                    'ring-green-400',
                                    'ring-opacity-75'
                                  )
                                  setTimeout(() => {
                                    originalBadge.classList.remove(
                                      'ring-2',
                                      'ring-green-400',
                                      'ring-opacity-75'
                                    )
                                  }, 2000)
                                }
                                console.log('Enddatum automatisch gespeichert')
                              } catch (error) {
                                console.error(
                                  'Fehler beim automatischen Speichern des Enddatums:',
                                  error
                                )
                                alert(
                                  'Fehler beim Speichern des Enddatums. Bitte versuchen Sie es erneut.'
                                )
                              }
                            }
                          }}
                          className='w-full [--cell-size:3.5rem] [--day-size:2.5rem]'
                          styles={{
                            day_selected: { background: '#2563eb' }
                          }}
                        />
                      </div>
                      <div className='flex items-center justify-center'>
                        <Badge className='end-datum-badge bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 px-3 py-1.5 text-sm transition-all duration-300'>
                          <CalendarIcon className='h-3.5 w-3.5 mr-2' />
                          {formatTurnierDate(
                            turnierEinstellungen.turnierEndDatum
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-white border-slate-200 shadow-sm'>
                <CardHeader className='pb-6 border-b border-slate-100'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-purple-100 rounded-lg'>
                      <Clock className='h-5 w-5 text-purple-600' />
                    </div>
                    <div>
                      <CardTitle className='text-xl text-slate-800'>
                        Turnierzeiten
                      </CardTitle>
                      <CardDescription className='text-slate-600'>
                        Start- und Endzeiten für jeden Turniertag festlegen
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-6 space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='space-y-4'>
                      <div className='flex items-center gap-2 mb-3'>
                        <CalendarIcon className='h-4 w-4 text-slate-600' />
                        <Label className='text-slate-700 font-medium text-sm'>
                          {tag1}
                        </Label>
                      </div>
                      <div className='grid grid-cols-2 gap-3'>
                        <div className='space-y-2'>
                          <Label
                            htmlFor='tag1Start'
                            className='text-slate-600 text-xs'
                          >
                            Startzeit {tag1}
                          </Label>
                          <Input
                            id='tag1Start'
                            type='time'
                            value={
                              turnierEinstellungen.samstagStartzeit || '09:00'
                            }
                            onChange={e =>
                              updateSettings('samstagStartzeit', e.target.value)
                            }
                            className='bg-white border-slate-300 text-slate-700 focus:border-purple-400 focus:ring-purple-400/20'
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label
                            htmlFor='tag1End'
                            className='text-slate-600 text-xs'
                          >
                            Endzeit {tag1}
                          </Label>
                          <Input
                            id='tag1End'
                            type='time'
                            value={
                              turnierEinstellungen.samstagEndzeit || '18:00'
                            }
                            onChange={e =>
                              updateSettings('samstagEndzeit', e.target.value)
                            }
                            className='bg-white border-slate-300 text-slate-700 focus:border-purple-400 focus:ring-purple-400/20'
                          />
                        </div>
                      </div>
                    </div>
                    <div className='space-y-4'>
                      <div className='flex items-center gap-2 mb-3'>
                        <CalendarIcon className='h-4 w-4 text-slate-600' />
                        <Label className='text-slate-700 font-medium text-sm'>
                          {tag2}
                        </Label>
                      </div>
                      <div className='grid grid-cols-2 gap-3'>
                        <div className='space-y-2'>
                          <Label
                            htmlFor='tag2Start'
                            className='text-slate-600 text-xs'
                          >
                            Startzeit {tag2}
                          </Label>
                          <Input
                            id='tag2Start'
                            type='time'
                            value={
                              turnierEinstellungen.sonntagStartzeit || '09:00'
                            }
                            onChange={e =>
                              updateSettings('sonntagStartzeit', e.target.value)
                            }
                            className='bg-white border-slate-300 text-slate-700 focus:border-purple-400 focus:ring-purple-400/20'
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label
                            htmlFor='tag2End'
                            className='text-slate-600 text-xs'
                          >
                            Endzeit {tag2}
                          </Label>
                          <Input
                            id='tag2End'
                            type='time'
                            value={
                              turnierEinstellungen.sonntagEndzeit || '18:00'
                            }
                            onChange={e =>
                              updateSettings('sonntagEndzeit', e.target.value)
                            }
                            className='bg-white border-slate-300 text-slate-700 focus:border-purple-400 focus:ring-purple-400/20'
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className='mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200'>
                    <div className='flex items-start gap-3'>
                      <Clock className='h-5 w-5 text-purple-600 mt-0.5' />
                      <div>
                        <div className='text-sm font-medium text-purple-900 mb-1'>
                          Aktuelle Turnierzeiten
                        </div>
                        <div className='text-xs text-purple-700 space-y-1'>
                          <div>
                            {tag1}:{' '}
                            {turnierEinstellungen.samstagStartzeit || '09:00'} -{' '}
                            {turnierEinstellungen.samstagEndzeit || '18:00'} Uhr
                          </div>
                          <div>
                            {tag2}:{' '}
                            {turnierEinstellungen.sonntagStartzeit || '09:00'} -{' '}
                            {turnierEinstellungen.sonntagEndzeit || '18:00'} Uhr
                          </div>
                          <div className='text-purple-600 font-medium mt-2'>
                            📅 Turnierdatum:{' '}
                            {new Date(
                              turnierEinstellungen.turnierStartDatum ||
                                '2025-07-05'
                            ).toLocaleDateString('de-DE', {
                              weekday: 'long',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}{' '}
                            -{' '}
                            {new Date(
                              new Date(
                                turnierEinstellungen.turnierStartDatum ||
                                  '2025-07-05'
                              ).setDate(
                                new Date(
                                  turnierEinstellungen.turnierStartDatum ||
                                    '2025-07-05'
                                ).getDate() + 1
                              )
                            ).toLocaleDateString('de-DE', {
                              weekday: 'long',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className='flex justify-end'>
                <Button
                  className='bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-2 transition-all duration-200'
                  onClick={saveSettings}
                  disabled={saving}
                >
                  {saving ? (
                    <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                  ) : (
                    <Save className='h-4 w-4 mr-2' />
                  )}
                  {saving ? 'Speichert...' : 'Einstellungen speichern'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value='export' className='mt-8'>
            <Card className='bg-white border-slate-200 shadow-sm'>
              <CardHeader className='pb-6 border-b border-slate-100'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-indigo-100 rounded-lg'>
                    <Download className='h-5 w-5 text-indigo-600' />
                  </div>
                  <div>
                    <CardTitle className='text-xl text-slate-800'>
                      Daten-Export & Backup
                    </CardTitle>
                    <CardDescription className='text-slate-600'>
                      Turnierdaten exportieren und Sicherungskopien erstellen
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='p-6 space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  <Button
                    variant='outline'
                    className='border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700 font-medium py-6 px-6 text-sm transition-all duration-200 h-auto flex-col gap-3'
                    onClick={handleExportAnmeldungenCSV}
                  >
                    <Download className='h-6 w-6' />
                    <div className='text-center'>
                      <div className='font-semibold'>
                        Anmeldungen exportieren
                      </div>
                      <div className='text-xs text-slate-500'>
                        CSV-Format für Analyse
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant='outline'
                    className='border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700 font-medium py-6 px-6 text-sm transition-all duration-200 h-auto flex-col gap-3'
                    onClick={handleExportSpielplanPDF}
                  >
                    <Download className='h-6 w-6' />
                    <div className='text-center'>
                      <div className='font-semibold'>Spielplan exportieren</div>
                      <div className='text-xs text-slate-500'>
                        PDF zum Ausdrucken
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant='outline'
                    className='border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700 font-medium py-6 px-6 text-sm transition-all duration-200 h-auto flex-col gap-3'
                    onClick={handlePreviewSpielplanPDF}
                  >
                    <Eye className='h-6 w-6' />
                    <div className='text-center'>
                      <div className='font-semibold'>PDF-Vorschau</div>
                      <div className='text-xs text-slate-500'>
                        PDF im Browser öffnen
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant='outline'
                    className='border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700 font-medium py-6 px-6 text-sm transition-all duration-200 h-auto flex-col gap-3'
                    onClick={handleExportStatistikenCSV}
                  >
                    <Download className='h-6 w-6' />
                    <div className='text-center'>
                      <div className='font-semibold'>
                        Statistiken exportieren
                      </div>
                      <div className='text-xs text-slate-500'>
                        CSV mit Statistikdaten
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant='outline'
                    className='border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-700 font-medium py-6 px-6 text-sm transition-all duration-200 h-auto flex-col gap-3'
                  >
                    <Upload className='h-6 w-6' />
                    <div className='text-center'>
                      <div className='font-semibold'>Daten importieren</div>
                      <div className='text-xs text-slate-500'>
                        CSV/Excel-Import
                      </div>
                    </div>
                  </Button>
                </div>
                <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                  <div className='flex items-start gap-3'>
                    <AlertCircle className='h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0' />
                    <div className='space-y-1'>
                      <p className='text-blue-800 font-medium text-sm'>
                        Datenschutz & Compliance
                      </p>
                      <p className='text-blue-700 text-xs leading-relaxed'>
                        Alle Exporte enthalten anonymisierte Daten gemäß
                        DSGVO-Richtlinien. Personenbezogene Daten werden nur mit
                        entsprechender Berechtigung exportiert.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Helfer Debug Dialog */}
        <Dialog
          open={showHelferDebugDialog}
          onOpenChange={setShowHelferDebugDialog}
        >
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                {helferDebugAction === 'flush' ? (
                  <>
                    <Trash2 className='h-5 w-5 text-red-600' />
                    Helfer-Datenbank leeren
                  </>
                ) : (
                  <>
                    <Shield className='h-5 w-5 text-blue-600' />
                    Demo-Daten erstellen
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {helferDebugAction === 'flush' ? (
                  <>
                    ⚠️ <strong>Achtung:</strong> Diese Aktion kann nicht
                    rückgängig gemacht werden!
                    <br />
                    <br />
                    Alle Helfer-Bedarfseinträge und Anmeldungen werden permanent
                    gelöscht. Der Helfer-Link wird ebenfalls entfernt.
                  </>
                ) : (
                  <>
                    🎭 Demo-Daten werden erstellt für:
                    <ul className='list-disc list-inside mt-2 text-sm space-y-1'>
                      <li>
                        8 Helfer-Bedarfseinträge (Aufbau, Schiedsrichter,
                        Verkauf, etc.)
                      </li>
                      <li>6 Beispiel-Anmeldungen</li>
                      <li>Neuer Demo-Helfer-Link</li>
                    </ul>
                    <br />
                    Bestehende Daten werden <strong>nicht</strong> gelöscht.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className='gap-2'>
              <Button
                variant='outline'
                onClick={() => {
                  setShowHelferDebugDialog(false)
                  setHelferDebugAction(null)
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleHelferDebugAction}
                disabled={loading}
                className={
                  helferDebugAction === 'flush'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              >
                {loading ? (
                  <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                ) : helferDebugAction === 'flush' ? (
                  <Trash2 className='h-4 w-4 mr-2' />
                ) : (
                  <Shield className='h-4 w-4 mr-2' />
                )}
                {helferDebugAction === 'flush'
                  ? 'Datenbank leeren'
                  : 'Demo-Daten erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Anmeldungen Debug Dialog */}
        <Dialog
          open={showAnmeldungenDebugDialog}
          onOpenChange={setShowAnmeldungenDebugDialog}
        >
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                {anmeldungenDebugAction === 'flush' ? (
                  <>
                    <Trash2 className='h-5 w-5 text-red-600' />
                    Anmeldungen-Datenbank leeren
                  </>
                ) : (
                  <>
                    <Trophy className='h-5 w-5 text-blue-600' />
                    Demo Teams erstellen
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {anmeldungenDebugAction === 'flush' ? (
                  <>
                    ⚠️ <strong>Achtung:</strong> Diese Aktion kann nicht
                    rückgängig gemacht werden!
                    <br />
                    <br />
                    Alle Team-Anmeldungen werden permanent gelöscht. Dies
                    betrifft auch den Spielplan!
                  </>
                ) : (
                  <>
                    🏆 Demo Team-Anmeldungen werden erstellt:
                    <ul className='list-disc list-inside mt-2 text-sm space-y-1'>
                      <li>8 Vereine mit verschiedenen Teams</li>
                      <li>Alle Jugendkategorien (Mini bis A-Jugend)</li>
                      <li>
                        4 Leistungsstufen: Anfänger, Fortgeschritten, Erfahren,
                        Sehr erfahren
                      </li>
                      <li>Teams mit und ohne Schiedsrichter</li>
                      <li>Verschiedene Zahlungsstatus</li>
                    </ul>
                    <br />
                    Bestehende Anmeldungen werden <strong>nicht</strong>{' '}
                    gelöscht.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className='gap-2'>
              <Button
                variant='outline'
                onClick={() => {
                  setShowAnmeldungenDebugDialog(false)
                  setAnmeldungenDebugAction(null)
                }}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAnmeldungenDebugAction}
                disabled={loading}
                className={
                  anmeldungenDebugAction === 'flush'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              >
                {loading ? (
                  <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                ) : anmeldungenDebugAction === 'flush' ? (
                  <Trash2 className='h-4 w-4 mr-2' />
                ) : (
                  <Trophy className='h-4 w-4 mr-2' />
                )}
                {anmeldungenDebugAction === 'flush'
                  ? 'Anmeldungen löschen'
                  : 'Demo Teams erstellen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Toaster />
      </div>
    </div>
  )
}
