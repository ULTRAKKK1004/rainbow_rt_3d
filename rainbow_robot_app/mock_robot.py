import socket
import struct
import time
import threading
import math

class MockRainbowRobot:
    def __init__(self, host='0.0.0.0', data_port=5001, cmd_port=5000):
        self.host = host
        self.data_port = data_port
        self.cmd_port = cmd_port
        self.joints = [0.0] * 6
        self.target_joints = [0.0] * 6
        self.running = True
        
        # Start command port thread
        self.cmd_thread = threading.Thread(target=self.run_cmd_server)
        self.cmd_thread.daemon = True
        self.cmd_thread.start()
        
        # Start data port thread
        self.data_thread = threading.Thread(target=self.run_data_server)
        self.data_thread.daemon = True
        self.data_thread.start()
        
        # Simulation loop for joint movement
        self.sim_thread = threading.Thread(target=self.simulation_loop)
        self.sim_thread.daemon = True
        self.sim_thread.start()

    def simulation_loop(self):
        last_time = time.time()
        while self.running:
            now = time.time()
            dt = now - last_time
            last_time = now
            
            # Simple P control for joint movement simulation
            for i in range(6):
                diff = self.target_joints[i] - self.joints[i]
                if abs(diff) > 0.001:
                    # Move towards target (max 1 rad/s)
                    step = diff * 5.0 * dt # proportional gain
                    max_step = 1.0 * dt
                    if step > max_step: step = max_step
                    if step < -max_step: step = -max_step
                    self.joints[i] += step
            
            time.sleep(0.01)

    def run_cmd_server(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind((self.host, self.cmd_port))
            s.listen()
            print(f"Mock Command Server listening on {self.cmd_port}...")
            while self.running:
                try:
                    conn, addr = s.accept()
                    with conn:
                        print(f"Command connection from {addr}")
                        while self.running:
                            data = conn.recv(1024)
                            if not data:
                                break
                            cmd = data.decode('utf-8').strip()
                            print(f"Received Command: {cmd}")
                            # Simple parser for move_j
                            if cmd.startswith("move_j"):
                                try:
                                    # Example: move_j(0,0,0,0,0,0,100,100)
                                    content = cmd[cmd.find("(")+1:cmd.find(")")]
                                    vals = [float(v.strip()) for v in content.split(",")]
                                    for i in range(6):
                                        self.target_joints[i] = math.radians(vals[i])
                                except Exception as e:
                                    print(f"Parse error: {e}")
                except Exception as e:
                    print(f"Cmd server accept error: {e}")

    def run_data_server(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind((self.host, self.data_port))
            s.listen()
            print(f"Mock Data Server listening on {self.data_port}...")
            while self.running:
                try:
                    conn, addr = s.accept()
                    with conn:
                        print(f"Data connection from {addr}")
                        while self.running:
                            try:
                                msg = conn.recv(1024)
                                if not msg: 
                                    print("Data client disconnected")
                                    break
                                
                                if b"reqdata" in msg:
                                    # Header: '$' (1), Size (2), Type (1) = 4 bytes
                                    payload_size = 1012 # Match standard or our expected
                                    header = struct.pack('<BHB', 0x24, payload_size, 0x03)
                                    
                                    payload = bytearray(payload_size)
                                    # Offset 0: time
                                    struct.pack_into('<d', payload, 0, time.time())
                                    # Offset 8: jnt_ref (desired)
                                    for i in range(6):
                                        struct.pack_into('<d', payload, 8 + i*8, self.target_joints[i])
                                    # Offset 56: jnt_ang (actual)
                                    for i in range(6):
                                        struct.pack_into('<d', payload, 56 + i*8, self.joints[i])
                                    
                                    conn.sendall(header + payload)
                                else:
                                    print(f"Unknown data request: {msg}")
                            except Exception as e:
                                print(f"Data server loop error: {e}")
                                break
                            time.sleep(0.01)
                except Exception as e:
                    print(f"Data server accept error: {e}")

if __name__ == "__main__":
    server = MockRainbowRobot()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        server.running = False
