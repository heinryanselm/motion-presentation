import { WebSocketServer } from 'ws';
import { createServer } from 'http';

class PresentationServer {
    constructor(port = process.env.PORT || 8080) {
        // Set port from environment variable for production deployment
        this.port = port;
        // Initialize Set to store connected WebSocket clients
        this.clients = new Set();
        // Define initial presentation state
        this.currentState = {
            currentSlide: 1,
            totalSlides: 10,
            isAutoMode: false
        };
        
        // Initialize the server setup
        this.setupServer();
    }
    
    setupServer() {
        // Create HTTP server to handle web requests
        this.httpServer = createServer((req, res) => {
            // Add CORS headers for cross-origin requests
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            
            // Route handling for different endpoints
            if (req.url === '/control' || req.url === '/control.html') {
                this.serveControlInterface(res);
            } else if (req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>🎯 Motion Presentation Server</h1>
                    <p>✅ Server is running on port ${this.port}!</p>
                    <p>🌍 Environment: ${process.env.NODE_ENV || 'development'}</p>
                    <p><a href="/control">🎮 Remote Control Interface</a></p>
                    <p><a href="https://YOUR-GITHUB-USERNAME.github.io/motion-presentation" target="_blank">📺 View Presentation</a></p>
                    <hr>
                    <h3>🔗 WebSocket Info:</h3>
                    <p>Endpoint: wss://motion-presentation-server.onrender.com/presentation</p>
                    <p>Connected clients: ${this.clients.size}</p>
                `);
            } else if (req.url === '/health') {
                // Health check endpoint for Render
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'healthy', 
                    port: this.port,
                    clients: this.clients.size,
                    timestamp: new Date().toISOString()
                }));
            } else {
                // Return 404 for unknown routes
                res.writeHead(404);
                res.end('Not found');
            }
        });
        
        // Create WebSocket server attached to HTTP server
        this.wss = new WebSocketServer({ 
            server: this.httpServer,
            path: '/presentation'
        });
        
        // Handle new WebSocket connections
        this.wss.on('connection', (ws, req) => {
            console.log('🔗 Client connected:', req.socket.remoteAddress);
            // Add new client to the clients set
            this.clients.add(ws);
            
            // Send current presentation state to newly connected client
            ws.send(JSON.stringify({
                type: 'state',
                ...this.currentState
            }));
            
            // Handle incoming messages from client
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });
            
            // Handle client disconnection
            ws.on('close', () => {
                console.log('🔌 Client disconnected');
                this.clients.delete(ws);
            });
            
            // Handle WebSocket errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
        
        // Start the HTTP server listening on specified port
        this.httpServer.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 Presentation server running on port ${this.port}`);
            console.log(`📱 Control interface: https://motion-presentation-server.onrender.com/control`);
            console.log(`🔗 WebSocket endpoint: wss://motion-presentation-server.onrender.com/presentation`);
        });
    }
    
    handleMessage(ws, data) {
        // Log received message for debugging
        console.log('📨 Received:', data);
        
        // Handle state updates from clients
        if (data.type === 'state') {
            // Update server's current state with received data
            this.currentState = { ...this.currentState, ...data };
            // Broadcast state change to all other clients
            this.broadcastToOtherClients(data, ws);
        } else if (data.type === 'command') {
            // Broadcast command to all presentation clients
            this.broadcastToOtherClients(data, ws);
        }
    }
    
    broadcastToOtherClients(data, sender) {
        // Send data to all connected clients except the sender
        this.clients.forEach(client => {
            if (client !== sender && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
    
    serveControlInterface(res) {
        const wsProtocol = "wss";
        const serverHost = "motion-presentation-server.onrender.com";
        const serverPort = "";
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Presentation Remote Control</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Reset default styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        /* Set body styling with dark theme */
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a; 
            color: #ffffff; 
            padding: 2rem;
            min-height: 100vh;
        }
        /* Center container with max width */
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            text-align: center;
        }
        /* Style main heading */
        h1 { 
            font-size: 2rem; 
            margin-bottom: 2rem; 
            color: #4ecdc4;
        }
        /* Style status display area */
        .status { 
            background: rgba(255, 255, 255, 0.1); 
            padding: 1rem; 
            border-radius: 10px; 
            margin-bottom: 2rem;
            backdrop-filter: blur(10px);
        }
        /* Grid layout for control buttons */
        .controls { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 1rem; 
            margin-bottom: 2rem;
        }
        /* Style for all buttons */
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
        /* Button hover effects */
        .btn:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 30px rgba(255, 255, 255, 0.2);
        }
        /* Slide navigation layout */
        .slide-nav { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 1rem; 
            margin-bottom: 2rem;
        }
        /* Style for slide number input */
        .slide-input { 
            background: rgba(255, 255, 255, 0.1); 
            border: 1px solid rgba(255, 255, 255, 0.3); 
            color: white; 
            padding: 0.5rem; 
            border-radius: 5px; 
            width: 80px; 
            text-align: center;
        }
        /* Connection status indicator styling */
        .connection-status { 
            padding: 0.5rem; 
            border-radius: 5px; 
            margin-bottom: 1rem;
        }
        /* Connected state styling */
        .connected { background: rgba(78, 205, 196, 0.2); }
        /* Disconnected state styling */
        .disconnected { background: rgba(255, 107, 107, 0.2); }
        /* Debug info styling */
        .debug { 
            background: rgba(255, 255, 255, 0.05); 
            padding: 1rem; 
            border-radius: 5px; 
            margin-top: 2rem; 
            font-family: monospace; 
            font-size: 0.8rem;
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Remote Control</h1>
        
        <!-- Connection status indicator -->
        <div class="connection-status" id="connectionStatus">
            Connecting...
        </div>
        
        <!-- Current presentation status display -->
        <div class="status" id="status">
            <div>Current Slide: <span id="currentSlide">1</span> / <span id="totalSlides">10</span></div>
            <div>Auto Mode: <span id="autoMode">Off</span></div>
        </div>
        
        <!-- Slide navigation controls -->
        <div class="slide-nav">
            <button class="btn" onclick="sendCommand('previous')">← Previous</button>
            <input type="number" class="slide-input" id="slideInput" min="1" max="10" value="1">
            <button class="btn" onclick="goToSlide()">Go</button>
            <button class="btn" onclick="sendCommand('next')">Next →</button>
        </div>
        
        <!-- Main control buttons -->
        <div class="controls">
            <button class="btn" onclick="sendCommand('play_timeline')">Play Timeline</button>
            <button class="btn" onclick="sendCommand('demonstrate_easing')">Demo Easing</button>
            <button class="btn" onclick="sendCommand('trigger_finale')">🚀 Finale</button>
            <button class="btn" onclick="sendCommand('toggle_auto')">Toggle Auto</button>
            <button class="btn" onclick="sendCommand('fullscreen')">Fullscreen</button>
            <button class="btn" onclick="sendCommand('reset')">Reset</button>
        </div>
        
        <!-- Debug information -->
        <div class="debug">
            <strong>🔧 Debug Info:</strong><br>
            WebSocket URL: ${wsProtocol}://${serverHost}${serverPort}/presentation<br>
            Environment: ${process.env.NODE_ENV || 'development'}<br>
            Server: ${serverHost}
        </div>
    </div>

    <script>
        // WebSocket connection variable
        let ws = null;
        // Connection state tracking
        let isConnected = false;
        
        // Function to establish WebSocket connection
        function connect() {
            // **UPDATED WEBSOCKET URL**
            const wsUrl = '${wsProtocol}://${serverHost}${serverPort}/presentation';
            console.log('🔗 Connecting to:', wsUrl);
            ws = new WebSocket(wsUrl);
            
            // Handle successful connection
            ws.onopen = () => {
                isConnected = true;
                updateConnectionStatus('Connected ✅', true);
                console.log('✅ Connected to WebSocket');
            };
            
            // Handle incoming messages
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('📨 Received:', data);
                if (data.type === 'state') {
                    updateStatus(data);
                }
            };
            
            // Handle connection close
            ws.onclose = () => {
                isConnected = false;
                updateConnectionStatus('Disconnected ❌', false);
                console.log('❌ WebSocket disconnected');
                // Attempt to reconnect after 3 seconds
                setTimeout(connect, 3000);
            };
            
            // Handle connection errors
            ws.onerror = (error) => {
                console.error('⚠️ WebSocket error:', error);
                updateConnectionStatus('Connection Error ⚠️', false);
            };
        }
        
        // Function to send commands to presentation
        function sendCommand(command, params = null) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'command',
                    command: command,
                    params: params,
                    timestamp: Date.now()
                }));
                console.log('📤 Sent command:', command, params);
            } else {
                console.log('❌ WebSocket not connected');
            }
        }
        
        // Function to navigate to specific slide
        function goToSlide() {
            const slideNumber = parseInt(document.getElementById('slideInput').value);
            sendCommand('goto', slideNumber);
        }
        
        // Function to update status display
        function updateStatus(data) {
            document.getElementById('currentSlide').textContent = data.currentSlide || 1;
            document.getElementById('totalSlides').textContent = data.totalSlides || 10;
            document.getElementById('autoMode').textContent = data.isAutoMode ? 'On' : 'Off';
            document.getElementById('slideInput').value = data.currentSlide || 1;
        }
        
        // Function to update connection status indicator
        function updateConnectionStatus(message, connected) {
            const statusEl = document.getElementById('connectionStatus');
            statusEl.textContent = message;
            statusEl.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
        }
        
        // Initialize connection on page load
        connect();
        
        // Add keyboard shortcuts for presentation control
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
        
        // Send HTML response to client
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
}

// Create and start the presentation server instance
const server = new PresentationServer();