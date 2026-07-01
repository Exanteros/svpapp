const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
erver');

const dev = process.env.NODE_';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
 port

// Initialize Next.js app
const app = next({ dev, hostname, port });
;

let smtpServer = null;

app.prepa
  // Create HTTP server for Next.js
  const httpServer = createServer(async ) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res
    } catch (err) {
     ;
     

    }
  });

  // Start HTTP server
  ht => {
    if (err) throw err;
    console.log(`🚀 Neort}`);
    
   dy

  });

  // Graceful shutdown
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
});

async function star
  try {
   .');
  
ver({
      port: smtpPort
      hostname: '0.0.0.0', // Listes
      domain: process.env.TEAM_EMAIL_DOMAIN |,
      dqlite'
    });

    await smtpServer
    
    console.log(`✅ SMTP Server started successfully
    console.log(`📧 ver`);
   `);
    
error) {
    console.error('❌ Failed to sta
    console.log('⚠️ Continuing without SMTP s
  }
}

async function grace
  console.log(`\n🛑`);
  
  if (smtpServer) {
   r...');
   ););
}ECTION'NHANDLED_REJ('UhutdowngracefulSson);
   rean:',mise, 'reaso at:', proectionnhandled Rejror('❌ U  console.er> {
mise) =n, proion', (reasojectdledRes.on('unhan

procesION');
});CEPTCAUGHT_EXutdown('UNgracefulSh
  or); erron:',eptiught Excor('❌ Uncaole.err cons{
 >  =error)n', (eptioughtExc'uncarocess.on(
ponsht excepticaugandle un
// Ht(0);
}
rocess.exiete');
  pown complShutde.log('✅ 
  consol
  top();
  }.s smtpServer await