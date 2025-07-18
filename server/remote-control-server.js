const WebSocket = require('ws');
const http = require('http');

class PresentationServer {
    constructor(port = 8080) {
        this.port = port;
        this.clients = new Set();
        this.currentState = {
            currentSlide: 1,
            totalSlides: 10,
            isAutoMode: false
        };
        
        this.setupServer();
    }
    
    setupServer() {
        // Create HTTP server
        this.httpServer = http.createServer((req, res) => {
            if (req.url === '/control' || req.url === '/control.html') {
                this.serveControlInterface(res);
            } else if (req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>Presentation Server</h1>
                    <p>Server is running!</p>
                    <p><a href="/control">Remote Control Interface</a></p>
                `);
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ 
            server: this.httpServer,
            path: '/presentation'
        });
        
        this.wss.on('connection', (ws, req) => {
            console.log('🔗 Client connected:', req.socket.remoteAddress);
            this.clients.add(ws);
            
            // Send current state to new client
            ws.send(JSON.stringify({
                type: 'state',
                ...this.currentState
            }));
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('🔌 Client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
        
        this.httpServer.listen(this.port, () => {
            console.log(`🚀 Presentation server running on port ${this.port}`);
            console.log(`📱 Control interface: http://localhost:${this.port}/control`);
            console.log(`🔗 WebSocket endpoint: ws://localhost:${this.port}/presentation`);
        });
    }
    
    handleMessage(ws, data) {
        console.log('📨 Received:', data);
        
        if (data.type === 'state') {
            this.currentState = { ...this.currentState, ...data };
            this.broadcastToOtherClients(data, ws);
        } else if (data.type === 'command') {
            // Broadcast command to all presentation clients
            this.broadcastToOtherClients(data, ws);
        }
    }
    
    broadcastToOtherClients(data, sender) {
        this.clients.forEach(client => {
            if (client !== sender && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
    
    serveControlInterface(res) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Presentation Remote Control</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a; 
            color: #ffffff; 
            padding: 2rem;
            min-height: 100vh;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            text-align: center;
        }
        h1 { 
            font-size: 2rem; 
            margin-bottom: 2rem; 
            color: #4ecdc4;
        }
        .status { 
            background: rgba(255, 255, 255, 0.1); 
            padding: 1rem; 
            border-radius: 10px; 
            margin-bottom: 2rem;
            backdrop-filter: blur(10px);
        }
        .controls { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 1rem; 
            margin-bottom: 2rem;
        }
        .btn { 
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4); 
            border: none; 
            color: white; 
            padding: 1rem 2rem; 
            border-radius: 10px; 
            cursor: pointer; 
            font-size: 1rem; 
            font-weight: bold;
            transition: all 0.3s ease;
        }
        .btn:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 30px rgba(255, 255, 255, 0.2);
        }
        .btn:active { 
            transform: translateY(0);
        }
        .slide-nav { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 1rem; 
            margin-bottom: 2rem;
        }
        .slide-input { 
            background: rgba(255, 255, 255, 0.1); 
            border: 1px solid rgba(255, 255, 255, 0.3); 
            color: white; 
            padding: 0.5rem; 
            border-radius: 5px; 
            width: 80px; 
            text-align: center;
        }
        .connection-status { 
            padding: 0.5rem; 
            border-radius: 5px; 
            margin-bottom: 1rem;
        }
        .connected { background: rgba(78, 205, 196, 0.2); }
        .disconnected { background: rgba(255, 107, 107, 0.2); }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Presentation Remote Control</h1>
        
        <div class="connection-status" id="connectionStatus">
            Connecting...
        </div>
        
        <div class="status" id="status">
            <div>Current Slide: <span id="currentSlide">1</span> / <span id="totalSlides">10</span></div>
            <div>Auto Mode: <span id="autoMode">Off</span></div>
        </div>
        
        <div class="slide-nav">
            <button class="btn" onclick="sendCommand('previous')">← Previous</button>
            <input type="number" class="slide-input" id="slideInput" min="1" max="10" value="1">
            <button class="btn" onclick="goToSlide()">Go</button>
            <button class="btn" onclick="sendCommand('next')">Next →</button>
        </div>
        
        <div class="controls">
            <button class="btn" onclick="sendCommand('play_timeline')">Play Timeline</button>
            <button class="btn" onclick="sendCommand('demonstrate_easing')">Demo Easing</button>
            <button class="btn" onclick="sendCommand('trigger_finale')">🚀 Finale</button>
            <button class="btn" onclick="sendCommand('toggle_auto')">Toggle Auto</button>
            <button class="btn" onclick="sendCommand('fullscreen')">Fullscreen</button>
            <button class="btn" onclick="sendCommand('reset')">Reset</button>
        </div>
    </div>

    <script>
        let ws = null;
        let isConnected = false;
        
        function connect() {
            ws = new WebSocket('ws://localhost:8080/presentation');
            
            ws.onopen = () => {
                isConnected = true;
                updateConnectionStatus('Connected', true);
                console.log('Remote control connected');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received:', data);
                if (data.type === 'state') {
                    updateStatus(data);
                }
            };
            
            ws.onclose = () => {
                isConnected = false;
                updateConnectionStatus('Disconnected', false);
                console.log('Remote control disconnected');
                setTimeout(connect, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                updateConnectionStatus('Connection Error', false);
            };
        }
        
        function sendCommand(command, params = null) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'command',
                    command: command,
                    params: params,
                    timestamp: Date.now()
                }));
                console.log('Sent command:', command, params);
            } else {
                console.log('WebSocket not connected');
            }
        }
        
        function goToSlide() {
            const slideNumber = parseInt(document.getElementById('slideInput').value);
            sendCommand('goto', slideNumber);
        }
        
        function updateStatus(data) {
            document.getElementById('currentSlide').textContent = data.currentSlide || 1;
            document.getElementById('totalSlides').textContent = data.totalSlides || 10;
            document.getElementById('autoMode').textContent = data.isAutoMode ? 'On' : 'Off';
            document.getElementById('slideInput').value = data.currentSlide || 1;
        }
        
        function updateConnectionStatus(message, connected) {
            const statusEl = document.getElementById('connectionStatus');
            statusEl.textContent = message;
            statusEl.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
        }
        
        // Connect on load
        connect();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    sendCommand('previous');
                    break;
                case 'ArrowRight':
                case ' ':
                    e.preventDefault();
                    sendCommand('next');
                    break;
                case 'f':
                    sendCommand('fullscreen');
                    break;
                case 'r':
                    sendCommand('reset');
                    break;
            }
        });
    </script>
</body>
</html>
        `;
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
}

// Start server
const server = new PresentationServer(8080);