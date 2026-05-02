import http.server
import socketserver
import threading
import json
import socket
import struct
import time
import os
import sys

# Configuration
ROBOT_IP = '127.0.0.1' # Change to real robot IP if needed
DATA_PORT = 5001
CMD_PORT = 5000
WEB_PORT = 8000

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")

# Global state
robot_state = {
    "joints": [0.0] * 6,
    "target": [0.0] * 6,
    "last_update": 0
}

def robot_client_thread():
    global robot_state
    print("Robot client thread started")
    while True:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(2.0)
                s.connect((ROBOT_IP, DATA_PORT))
                print(f"Connected to Robot at {ROBOT_IP}:{DATA_PORT}")
                while True:
                    # Request data
                    s.sendall(b"reqdata")
                    
                    # Receive header
                    header = s.recv(4)
                    if not header:
                        print("Connection closed by robot (no header)")
                        break
                    if header[0] != 0x24:
                        print(f"Invalid header start: {header[0]}")
                        break
                    
                    # Size from header
                    size = struct.unpack('<H', header[1:3])[0]
                    
                    # Receive payload
                    payload = b""
                    while len(payload) < size:
                        chunk = s.recv(size - len(payload))
                        if not chunk: break
                        payload += chunk
                    
                    if len(payload) >= 104:
                        joints = struct.unpack('<6d', payload[56:104])
                        target = struct.unpack('<6d', payload[8:56])
                        robot_state["joints"] = list(joints)
                        robot_state["target"] = list(target)
                        robot_state["last_update"] = time.time()
                    
                    time.sleep(0.05)
        except Exception as e:
            print(f"Robot connection error: {e}. Retrying in 2s...")
            time.sleep(2)

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(robot_state).encode())
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/move':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            params = json.loads(post_data)
            
            try:
                joints = params.get("joints", [0,0,0,0,0,0])
                cmd = f"move_j({joints[0]},{joints[1]},{joints[2]},{joints[3]},{joints[4]},{joints[5]},100,100)\n"
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(2.0)
                    s.connect((ROBOT_IP, CMD_PORT))
                    s.sendall(cmd.encode())
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "sent"}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    if not os.path.exists("web"):
        os.makedirs("web")
        
    t = threading.Thread(target=robot_client_thread)
    t.daemon = True
    t.start()
    
    print(f"Starting web server at http://127.0.0.1:{WEB_PORT}")
    with socketserver.TCPServer(("127.0.0.1", WEB_PORT), MyHandler) as httpd:
        httpd.serve_forever()

