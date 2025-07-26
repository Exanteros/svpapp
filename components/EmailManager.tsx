'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Send,
  MessageSquare,
  Clock,
  User,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface TeamEmail {
  id: number;
  team_id: number;
  email_address: string;
  email_alias?: string;
  created_at: string;
  is_active: boolean;
  teamname?: string;
}

interface EmailConversation {
  id: number;
  team_email_id: number;
  subject: string;
  thread_id?: string;
  created_at: string;
  updated_at: string;
  status: string;
  message_count: number;
  last_message_at?: string;
  email_address: string;
  email_alias?: string;
  unread_count: number;
}

interface EmailMessage {
  id: number;
  conversation_id: number;
  message_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  direction: 'incoming' | 'outgoing';
  is_read: boolean;
  created_at: string;
  attachments_json?: string;
}

interface EmailManagerProps {
  trigger?: React.ReactNode;
}

export default function EmailManager({ trigger }: EmailManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [teamEmails, setTeamEmails] = useState<TeamEmail[]>([]);
  const [conversations, setConversations] = useState<EmailConversation[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Neue Team-Email erstellen
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  // Neue Nachricht
  const [replyMessage, setReplyMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTeamEmails();
    }
  }, [isOpen]);

  const loadTeamEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/email/team-emails');
      const data = await response.json();
      
      if (data.success) {
        setTeamEmails(data.teamEmails || []);
      } else {
        setError(data.error || 'Fehler beim Laden der Team-Emails');
      }
    } catch (err) {
      setError('Netzwerk-Fehler beim Laden der Team-Emails');
      console.error('Error loading team emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (teamId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/email/conversations?teamId=${teamId}`);
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
      } else {
        setError(data.error || 'Fehler beim Laden der Konversationen');
      }
    } catch (err) {
      setError('Netzwerk-Fehler beim Laden der Konversationen');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/email/conversations?conversationId=${conversationId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
        setSelectedConversation(conversationId);
      } else {
        setError(data.error || 'Fehler beim Laden der Nachrichten');
      }
    } catch (err) {
      setError('Netzwerk-Fehler beim Laden der Nachrichten');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTeamEmail = async () => {
    if (!newTeamName || !newTeamId) {
      setError('Team-Name und Team-ID sind erforderlich');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/email/team-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: parseInt(newTeamId),
          teamName: newTeamName,
          domain: customDomain || undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNewTeamName('');
        setNewTeamId('');
        setCustomDomain('');
        await loadTeamEmails();
      } else {
        setError(data.error || 'Fehler beim Erstellen der Team-Email');
      }
    } catch (err) {
      setError('Netzwerk-Fehler beim Erstellen der Team-Email');
      console.error('Error creating team email:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedConversation || !replyMessage.trim()) {
      setError('Nachricht ist erforderlich');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/email/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: 1, // TODO: Dynamisch bestimmen
          message: replyMessage,
          isReply: true,
          replyTo: selectedConversation.toString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setReplyMessage('');
        await loadMessages(selectedConversation);
      } else {
        setError(data.error || 'Fehler beim Senden der Nachricht');
      }
    } catch (err) {
      setError('Netzwerk-Fehler beim Senden der Nachricht');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const formatEmailAddress = (email: string) => {
    return email.length > 30 ? `${email.substring(0, 30)}...` : email;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Email-Manager
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email-Management für Teams
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="conversations">Konversationen</TabsTrigger>
            <TabsTrigger value="create">Neue Team-Email</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Team-Emails</h3>
                <Button onClick={loadTeamEmails} variant="outline" size="sm" disabled={loading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aktualisieren
                </Button>
              </div>

              <ScrollArea className="h-[450px]">
                <div className="space-y-2">
                  {teamEmails.map((teamEmail) => (
                    <Card key={teamEmail.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{teamEmail.email_alias || teamEmail.teamname}</h4>
                            <Badge variant={teamEmail.is_active ? "default" : "secondary"}>
                              {teamEmail.is_active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 font-mono">
                            {formatEmailAddress(teamEmail.email_address)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Erstellt: {formatDateTime(teamEmail.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              loadConversations(teamEmail.team_id);
                              setActiveTab('conversations');
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Konversationen
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {teamEmails.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Noch keine Team-Emails erstellt</p>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => setActiveTab('create')}
                      >
                        Erste Team-Email erstellen
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="conversations" className="flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
              {/* Konversations-Liste */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Konversationen</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedConversation === conversation.id
                              ? 'bg-blue-50 border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => loadMessages(conversation.id)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-sm">{conversation.subject}</h4>
                            {conversation.unread_count > 0 && (
                              <Badge variant="default" className="text-xs">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-1">
                            {formatEmailAddress(conversation.email_address)}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {conversation.message_count} Nachrichten
                            </span>
                            <span className="text-xs text-gray-500">
                              {conversation.last_message_at && formatDateTime(conversation.last_message_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {conversations.length === 0 && (
                        <p className="text-center text-gray-500 py-8">
                          Keine Konversationen gefunden
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Nachrichten-Ansicht */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedConversation ? 'Nachrichten' : 'Konversation auswählen'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedConversation ? (
                    <div className="space-y-4">
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-md ${
                                message.direction === 'incoming'
                                  ? 'bg-gray-50 ml-4'
                                  : 'bg-blue-50 mr-4'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {message.direction === 'incoming' ? 'Eingehend' : 'Ausgehend'}
                                  </span>
                                  {message.direction === 'incoming' && !message.is_read && (
                                    <Badge variant="secondary" className="text-xs">Neu</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDateTime(message.created_at)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                Von: {formatEmailAddress(message.from_email)}
                              </p>
                              <p className="text-sm text-gray-600 mb-2">
                                An: {formatEmailAddress(message.to_email)}
                              </p>
                              <div className="text-sm">
                                {message.body_html ? (
                                  <div dangerouslySetInnerHTML={{ __html: message.body_html }} />
                                ) : (
                                  <p className="whitespace-pre-wrap">{message.body_text}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <Separator />

                      <div className="space-y-3">
                        <Textarea
                          placeholder="Antwort schreiben..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <Button onClick={sendReply} disabled={loading || !replyMessage.trim()}>
                          <Send className="h-4 w-4 mr-2" />
                          Antwort senden
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Wählen Sie eine Konversation aus, um Nachrichten anzuzeigen</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="create" className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle>Neue Team-Email erstellen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Team-Name</label>
                    <Input
                      placeholder="z.B. FC Beispiel"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Team-ID</label>
                    <Input
                      type="number"
                      placeholder="z.B. 1"
                      value={newTeamId}
                      onChange={(e) => setNewTeamId(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Custom Domain (optional)</label>
                  <Input
                    placeholder="z.B. mein-turnier.example.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Wenn leer, wird die Standard-Domain verwendet
                  </p>
                </div>

                {newTeamName && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800 mb-1">Vorschau der Email-Adresse:</p>
                    <p className="font-mono text-sm text-blue-900">
                      svp-{newTeamName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8)}-[random]@
                      {customDomain || 'turnier.example.com'}
                    </p>
                  </div>
                )}

                <Button onClick={createTeamEmail} disabled={loading || !newTeamName || !newTeamId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Team-Email erstellen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
