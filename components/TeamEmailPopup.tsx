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

interface TeamEmailPopupProps {
  teamId: string
  teamName: string
  trigger: React.ReactNode
}

interface TeamEmail {
  id: number;
  team_id: string;
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
  last_message_at: string;
  email_address: string;
  email_alias: string;
  unread_count: number;
}

interface EmailMessage {
  id: number;
  conversation_id: number;
  message_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  text_body: string;
  html_body?: string;
  direction: 'incoming' | 'outgoing';
  is_read: boolean;
  created_at: string;
  attachments?: string;
  raw_email?: string;
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
      
      // Check if response is actually JSON
      const contentType = emailResponse.headers.get('content-type');
      console.log('Response content-type:', contentType);
      console.log('Response status:', emailResponse.status);
      
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${emailResponse.status} - ${errorText.substring(0, 200)}`);
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await emailResponse.text();
        console.error('Non-JSON response received:', responseText.substring(0, 500));
        throw new Error('Server returned HTML instead of JSON. Check server logs.');
      }
      
      const emailData = await emailResponse.json();
      
      console.log('Team email response:', emailData);
      
      if (emailData.success && emailData.teamEmail) {
        setTeamEmail(emailData.teamEmail);
        
        // Lade Konversationen für dieses Team
        const convResponse = await fetch(`/api/email/conversations?teamId=${String(teamId)}`);
        const convData = await convResponse.json();
        
        console.log('Conversations response:', convData);
        
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
      const response = await fetch('/api/email/team-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: String(teamId),
          teamName
        })
      });

      const data = await response.json();
      console.log('Create team email response:', data);

      if (data.success) {
        setTeamEmail(data.teamEmail);
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

    setLoading(true);
    setError(null);

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
          teamId: String(teamId),
          conversationId: selectedConversation,
          message: replyMessage,
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
              <div className="text-xl font-bold">{teamName} - E-Mail Center</div>
              {teamEmail && (
                <div className="text-sm text-gray-600 font-normal">
                  {teamEmail.email_address}
                </div>
              )}
            </div>
            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {totalUnreadCount} ungelesen
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadTeamEmailData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 h-[calc(95vh-120px)]">
          {/* Konversationen Sidebar */}
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2">Konversationen</h3>
            </div>
            
            <ScrollArea className="flex-1 h-0">
              <div className="p-2">
                {loading && conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Lade Konversationen...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <div className="text-sm">Keine E-Mails vorhanden</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {teamEmail ? 'E-Mails werden hier angezeigt' : 'Team-E-Mail wird erstellt...'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <Card 
                        key={conv.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedConversation === conv.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : conv.unread_count > 0 
                              ? 'border-orange-300 bg-orange-50' 
                              : 'hover:bg-gray-50'
                        }`}
                        onClick={() => loadMessages(conv.id)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{conv.subject}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {formatEmailAddress(conv.email_address)}
                              </div>
                            </div>
                            {conv.unread_count > 0 && (
                              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{conv.message_count} Nachricht{conv.message_count !== 1 ? 'en' : ''}</span>
                            <span>{formatDateTime(conv.last_message_at)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat-Bereich */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Nachrichten */}
                <ScrollArea className="flex-1 h-0">
                  <div className="p-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <div>Keine Nachrichten in dieser Konversation</div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => (
                          <div
                            key={message.id}
                            className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                message.direction === 'outgoing'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <div className="text-sm mb-1">
                                <strong>
                                  {message.direction === 'outgoing' ? teamEmail?.email_alias : message.from_email}
                                </strong>
                              </div>
                              <div className="whitespace-pre-wrap">{message.text_body}</div>
                              <div className={`text-xs mt-2 ${
                                message.direction === 'outgoing' ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {formatDateTime(message.created_at)}
                                {message.direction === 'incoming' && !message.is_read && (
                                  <Badge variant="secondary" className="ml-2 text-xs">Neu</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Antwort-Bereich */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Antwort schreiben..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="flex-1 min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                    />
                    <Button 
                      onClick={sendReply}
                      disabled={!replyMessage.trim() || loading}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Strg+Enter zum Senden
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium">Wählen Sie eine Konversation</div>
                  <div className="text-sm">Klicken Sie auf eine E-Mail links, um sie zu öffnen</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
