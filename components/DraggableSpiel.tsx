'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Clock, MapPin, GripVertical, Play, CheckCircle, Pause, AlertCircle } from 'lucide-react';

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
  liveTime?: string;
  spielzeit?: number;
}

interface DraggableSpielProps {
  spiel: Spiel;
  index: number;
  selectedField: string;
  spielplanData?: { liveData?: { [spielId: string]: any } };
  isMobile?: boolean;
  isAdmin?: boolean;
  onTimeChange?: (spielId: string, newTime: string) => void;
  getStatusBadge: (spiel: Spiel, spielplanData?: any) => React.ReactNode;
}

export function DraggableSpiel({
  spiel,
  index,
  selectedField,
  spielplanData,
  isMobile = false,
  isAdmin = false,
  onTimeChange,
  getStatusBadge
}: DraggableSpielProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spiel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isLive = spiel.status === 'laufend' || 
    spielplanData?.liveData?.[spiel.id]?.status === 'running';

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onTimeChange && isAdmin) {
      onTimeChange(spiel.id, e.target.value);
    }
  };

  // Mobile Touch Handler für bessere UX
  const handleMobileTouch = (e: React.TouchEvent) => {
    if (isAdmin && isMobile) {
      // Verhindere Standard-Touch-Verhalten nur im Admin-Modus
      e.preventDefault();
    }
  };

  // Verbesserte Mobile-UX mit Touch-Feedback
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAdmin && isMobile) {
      const target = e.currentTarget as HTMLElement;
      target.style.transform = 'scale(1.02)';
      target.style.transition = 'transform 0.1s ease';
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isAdmin && isMobile) {
      const target = e.currentTarget as HTMLElement;
      target.style.transform = 'scale(1)';
    }
  };

  if (isMobile) {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`
          ${isDragging ? 'ring-2 ring-blue-400 ring-opacity-50 scale-105' : ''}
          ${isLive ? 'ring-2 ring-red-400 ring-opacity-50 bg-red-50' : ''}
          ${isAdmin ? 'border-blue-200 border-2' : 'border'}
          ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}
          transition-all duration-200 ease-in-out
          ${isAdmin ? 'touch-manipulation select-none' : ''}
          max-w-full overflow-hidden
        `}
        {...(isAdmin ? attributes : {})}
        {...(isAdmin ? listeners : {})}
        onTouchStart={isAdmin ? handleTouchStart : undefined}
        onTouchEnd={isAdmin ? handleTouchEnd : undefined}
      >
        <CardContent className="p-3 sm:p-4">
          {isAdmin && (
            <div className="flex items-center justify-center mb-2 py-2 bg-blue-50 rounded-md">
              <GripVertical className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-xs text-blue-600 font-medium">Zum Verschieben antippen und ziehen</span>
            </div>
          )}
          
          <div className="flex justify-between items-start mb-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
              {isAdmin ? (
                <Input
                  type="time"
                  value={spiel.zeit}
                  onChange={handleTimeChange}
                  className="w-24 sm:w-28 h-9 text-sm sm:text-base font-medium"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="font-semibold text-base sm:text-lg whitespace-nowrap">{spiel.zeit}</span>
              )}
              {selectedField === 'alle' && (
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                  <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">{spiel.feld}</span>
                </div>
              )}
            </div>
            <Badge variant="outline" className="text-xs flex-shrink-0 whitespace-nowrap">{spiel.kategorie}</Badge>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="text-center bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="font-medium text-xs text-gray-500 mb-2">Teams</div>
              <div className="space-y-2">
                <div className="font-bold text-sm sm:text-base text-gray-800 break-words">{spiel.team1}</div>
                <div className="text-gray-400 text-sm font-medium">vs</div>
                <div className="font-bold text-sm sm:text-base text-gray-800 break-words">{spiel.team2}</div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mb-3">
            {getStatusBadge(spiel, spielplanData)}
          </div>
          
          {isAdmin && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-700 text-center font-medium">
                💡 Tipp: Langes Antippen und ziehen zum Verschieben
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Desktop Table Row
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`
        ${isDragging ? 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50' : ''}
        ${isLive ? 'ring-2 ring-red-400 ring-opacity-50 bg-red-50' : ''}
        ${isAdmin ? 'hover:bg-blue-50 border-l-4 border-l-blue-200' : ''}
        ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}
        transition-all duration-200 ease-in-out
      `}
      {...(isAdmin ? attributes : {})}
      {...(isAdmin ? listeners : {})}
    >
      {isAdmin && (
        <TableCell className="w-[50px] text-center bg-blue-50">
          <div className="flex flex-col items-center">
            <GripVertical className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-xs text-blue-600 font-medium">Drag</span>
          </div>
        </TableCell>
      )}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          {isAdmin ? (
            <Input
              type="time"
              value={spiel.zeit}
              onChange={handleTimeChange}
              className="w-24 h-9 text-sm font-medium border-blue-200 focus:border-blue-400"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="font-semibold">{spiel.zeit}</span>
          )}
        </div>
      </TableCell>
      {selectedField === 'alle' && (
        <TableCell>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-gray-500" />
            {spiel.feld}
          </div>
        </TableCell>
      )}
      <TableCell>
        <Badge variant="outline">{spiel.kategorie}</Badge>
      </TableCell>
      <TableCell className="font-medium">{spiel.team1}</TableCell>
      <TableCell className="font-medium">{spiel.team2}</TableCell>
      <TableCell className="text-center">{getStatusBadge(spiel, spielplanData)}</TableCell>
    </TableRow>
  );
}
