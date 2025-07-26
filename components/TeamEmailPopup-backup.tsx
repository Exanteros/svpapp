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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamEmailPopupProps {
  teamId: string
  teamName: string
  trigger: React.ReactNode
}
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Send,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface TeamEmail {
  id: number;
  team_id: number;
  email_address: string;
  email_alias?: string;
  created_at: string;
  is_active: boolean;
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

export default function TeamEmailPopup({ teamId, teamName, trigger }: TeamEmailPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [teamEmail, setTeamEmail] = useState<TeamEmail | null>(null);
  const [conversations, setConversations] = useState<EmailConversation[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Debug-Log für teamId
  useEffect(() => {
    console.log('TeamEmailPopup - teamId:', teamId, 'type:', typeof teamId);
  }, [teamId]);

  useEffect(() => {
    if (isOpen && teamId) {
      loadTeamEmailData();
    }
  }, [isOpen, teamId]);

  const loadTeamEmailData = async () => {
    if (!teamId) {
      setError('Team-ID ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);
    
    console.log('Loading team email data for:', { teamId: String(teamId), teamName });
    
    try {
      // Lade Team-Email
      const emailResponse = await fetch(`/api/email/team-emails?teamId=${String(teamId)}`);
      const emailData = await emailResponse.json();
      
      console.log('Team email response:', emailData);
      
      if (emailData.success && emailData.teamEmail) {
        setTeamEmail(emailData.teamEmail);
        
        // Lade Konversationen für dieses Team
        const convResponse = await fetch(`/api/email/conversations?teamId=${String(teamId)}`);
        const convData = await convResponse.json();
        
        if (convData.success) {
          setConversations(convData.conversations || []);
          
          // Automatisch erste Konversation mit ungelesenen Nachrichten auswählen
          const unreadConv = convData.conversations.find((c: EmailConversation) => c.unread_count > 0);
          if (unreadConv) {
            loadMessages(unreadConv.id);
          } else if (convData.conversations.length > 0) {
            loadMessages(convData.conversations[0].id);
          }
        }
      } else {
        console.log('No team email found, creating new one...');
        // Erstelle automatisch Team-Email wenn nicht vorhanden
        await createTeamEmail();
      }
    } catch (err) {
      console.error('Error loading team email data:', err);
      setError('Fehler beim Laden der Email-Daten');
    } finally {
      setLoading(false);
    }
  };

  const createTeamEmail = async () => {
    console.log('Creating team email for:', { teamId, teamName });
    
    if (!teamId || !teamName) {
      setError('Team-ID und Team-Name sind erforderlich');
      return;
    }
    
    try {
      // Verwende erst Test-API zum Debuggen
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: teamId.toString(),
          teamName
        })
      });

      const data = await response.json();
      console.log('Test API response:', data);
      
      if (data.success) {
        setTeamEmail(data.teamEmail);
        setConversations([]);
        setError(null);
        console.log('Team email created successfully');
      } else {
        console.error('API returned error:', data);
        setError(data.error || 'Fehler beim Erstellen der Team-Email');
      }
    } catch (err) {
      console.error('Network error creating team email:', err);
      setError('Netzwerk-Fehler beim Erstellen der Team-Email');
    }
  };

  const loadMessages = async (conversationId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/email/conversations?teamId=${String(teamId)}&conversationId=${conversationId}`);
      const data = await response.json();
      
      console.log('Messages response:', data);
      
      if (data.success) {
        setMessages(data.messages || []);
        setSelectedConversation(conversationId);
      } else {
        setError(data.error || 'Fehler beim Laden der Nachrichten');
      }
    } catch (err) {
      setError('Fehler beim Laden der Nachrichten');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedConversation || !teamEmail) {
      return;
    }

    try {
      console.log('Sending reply:', {
        teamId: String(teamId),
        conversationId: selectedConversation,
        message: replyMessage,
        teamEmail: teamEmail.email_address
      });

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamEmail: teamEmail.email_address,
          message: replyMessage,
          conversationId: selectedConversation,
          isReply: true
        })
      });

      const data = await response.json();
      console.log('Send reply response:', data);

      if (data.success) {
        setReplyMessage('');
        // Lade Nachrichten neu
        loadMessages(selectedConversation);
        // Lade auch Konversationen neu für Update der unread counts
        loadTeamEmailData();
      } else {
        setError(data.error || 'Fehler beim Senden der Nachricht');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      setError('Fehler beim Senden der Nachricht');
    }
  };
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Reply sent successfully');
        setReplyMessage('');
        // Lade Nachrichten neu
        await loadMessages(selectedConversation);
        // Lade Team-E-Mail-Daten neu für aktuelle Konversationen
        await loadTeamEmailData();
      } else {
        setError(data.error || 'Fehler beim Senden der Antwort');
      }
    } catch (err) {
      setError('Fehler beim Senden der Antwort');
      console.error('Error sending reply:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const formatEmailAddress = (email: string) => {
    return email.length > 40 ? `${email.substring(0, 40)}...` : email;
  };

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="relative">
            <Mail className="h-5 w-5" />
            {totalUnreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {totalUnreadCount}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="!max-w-none !w-[calc(100vw-32px)] !h-[calc(95vh-32px)] p-0 gap-0 rounded-lg !left-4 !top-4 !translate-x-0 !translate-y-0 !fixed">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <div>
              <span className="text-xl">Email-Verlauf: {teamName}</span>
              {teamEmail && (
                <p className="text-sm font-normal text-gray-600 mt-1">
                  Team-Email: {formatEmailAddress(teamEmail.email_address)}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!teamEmail ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">Keine Team-Email gefunden</p>
                <Button onClick={createTeamEmail} disabled={loading}>
                  Team-Email erstellen
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-6">              {/* Konversations-Liste */}
              <Card className="lg:col-span-1 flex flex-col h-full">
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Konversationen</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={loadTeamEmailData}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-3">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-3">                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedConversation === conversation.id
                              ? 'bg-blue-50 border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => loadMessages(conversation.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm line-clamp-2">{conversation.subject}</h4>
                          {conversation.unread_count > 0 && (
                            <Badge variant="default" className="text-xs ml-2">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{conversation.message_count} Nachrichten</span>
                          {conversation.last_message_at && (
                            <span>{formatDateTime(conversation.last_message_at)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {conversations.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Noch keine Konversationen</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>              {/* Nachrichten-Ansicht */}
              <Card className="lg:col-span-2 flex flex-col h-full">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-base">
                    {selectedConversation ? 'Nachrichten' : 'Konversation auswählen'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-3">
                  {selectedConversation ? (
                    <div className="flex flex-col h-full">
                      <ScrollArea className="flex-1 mb-4">
                        <div className="space-y-4 pr-3">                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`p-4 rounded-lg ${
                                message.direction === 'incoming'
                                  ? 'bg-gray-50 ml-4'
                                  : 'bg-blue-50 mr-4'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {message.direction === 'incoming' ? 'Eingehend' : 'Ausgehend'}
                                  </span>
                                  {message.direction === 'incoming' && !message.is_read && (
                                    <Badge variant="secondary" className="text-xs">Neu</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {formatDateTime(message.created_at)}
                                </div>
                            </div>
                            <div className="mb-2">
                              <p className="text-xs text-gray-600 mb-1">
                                <strong>Von:</strong> {formatEmailAddress(message.from_email)}
                              </p>
                              <p className="text-xs text-gray-600 mb-1">
                                <strong>An:</strong> {formatEmailAddress(message.to_email)}
                              </p>
                              <p className="text-xs text-gray-600 mb-2">
                                <strong>Betreff:</strong> {message.subject}
                              </p>
                            </div>
                            <div className="text-sm">
                              {message.body_html ? (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: message.body_html }} 
                                  className="prose prose-sm max-w-none"
                                />
                              ) : (
                                <p className="whitespace-pre-wrap">{message.body_text}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <Separator className="my-4" />

                    <div className="space-y-3 flex-shrink-0">
                      <Textarea
                        placeholder="Antwort schreiben..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end">
                        <Button 
                          onClick={sendReply} 
                          disabled={loading || !replyMessage.trim()}
                          className="px-6"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Antwort senden
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500 flex items-center justify-center h-full">
                    <div>
                      <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">Wählen Sie eine Konversation aus</p>
                      <p className="text-sm mt-2">um Nachrichten anzuzeigen und zu antworten</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
