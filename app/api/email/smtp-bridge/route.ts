/**
 * HTTP-zu-SMTP Proxy
 * Empfängt HTTP-Requests und leitet sie an den lokalen SMTP-Server weiter
 */

import { NextRequest, NextResponse } from 'next/server';
import net from 'net';

export async function POST(request: NextRequest) {
  try {
    const emailData = await request.json();
    
    // Simuliere SMTP-Übertragung über TCP
    const result = await sendToSMTP(emailData);
    
    return NextResponse.json({
      success: true,
      message: 'Email via HTTP-zu-SMTP Bridge übertragen',
      smtpResult: result
    });
    
  } catch (error) {
    console.error('HTTP-zu-SMTP Bridge Fehler:', error);
    return NextResponse.json({
      success: false,
      error: 'Bridge transmission failed'
    }, { status: 500 });
  }
}

async function sendToSMTP(emailData: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = '';
    
    client.connect(2525, 'localhost', () => {
      console.log('📡 Verbunden mit lokalem SMTP-Server');
      
      // SMTP Commands
      const commands = [
        'EHLO httpbridge.local',
        `MAIL FROM:<${emailData.from}>`,
        `RCPT TO:<${emailData.to}>`,
        'DATA',
        `Subject: ${emailData.subject}\r\n\r\n${emailData.text || emailData.html}\r\n.`,
        'QUIT'
      ];
      
      let commandIndex = 0;
      
      const sendNextCommand = () => {
        if (commandIndex < commands.length) {
          const command = commands[commandIndex];
          console.log(`📤 SMTP: ${command}`);
          client.write(command + '\r\n');
          commandIndex++;
        } else {
          client.end();
        }
      };
      
      client.on('data', (data) => {
        const serverResponse = data.toString();
        console.log(`📥 SMTP Response: ${serverResponse.trim()}`);
        response += serverResponse;
        
        // Warte auf positive Antwort und sende nächsten Befehl
        if (serverResponse.startsWith('220') || 
            serverResponse.startsWith('250') || 
            serverResponse.startsWith('354')) {
          setTimeout(sendNextCommand, 100);
        }
      });
      
      // Starte mit erstem Command
      sendNextCommand();
    });
    
    client.on('close', () => {
      console.log('✅ SMTP-Verbindung geschlossen');
      resolve(response);
    });
    
    client.on('error', (err) => {
      console.error('❌ SMTP-Verbindung Fehler:', err);
      reject(err);
    });
    
    // Timeout
    setTimeout(() => {
      client.destroy();
      reject(new Error('SMTP Timeout'));
    }, 10000);
  });
}

export async function GET() {
  return NextResponse.json({
    service: 'HTTP-zu-SMTP Bridge',
    status: 'active',
    description: 'Leitet HTTP-Requests an lokalen SMTP-Server weiter',
    usage: 'POST Email-Daten an diesen Endpoint'
  });
}
