#!/usr/bin/env python3
"""
Simple HTTP server for the game that handles audio files properly.
Run with: python3 server.py
"""

import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        
        # For audio files, accept range requests but serve full file
        if self.path.endswith(('.mp3', '.wav', '.ogg')):
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Content-Type', 'audio/mpeg' if self.path.endswith('.mp3') else 'audio/wav')
        
        super().end_headers()
    
    def do_GET(self):
        # Handle range requests for audio files
        if self.path.endswith(('.mp3', '.wav', '.ogg')):
            try:
                filepath = self.path.lstrip('/')
                if not os.path.exists(filepath):
                    self.send_error(404)
                    return
                
                file_size = os.path.getsize(filepath)
                
                # Check for range request
                range_header = self.headers.get('Range')
                if range_header:
                    # Parse range header
                    byte_start = 0
                    byte_end = file_size - 1
                    
                    # Simple range parsing
                    if 'bytes=' in range_header:
                        ranges = range_header.replace('bytes=', '').split('-')
                        if ranges[0]:
                            byte_start = int(ranges[0])
                        if ranges[1]:
                            byte_end = int(ranges[1])
                    
                    # Send partial content
                    self.send_response(206)
                    self.send_header('Content-Type', 'audio/mpeg' if self.path.endswith('.mp3') else 'audio/wav')
                    self.send_header('Content-Length', str(byte_end - byte_start + 1))
                    self.send_header('Content-Range', f'bytes {byte_start}-{byte_end}/{file_size}')
                    self.send_header('Accept-Ranges', 'bytes')
                    self.end_headers()
                    
                    # Send file chunk
                    with open(filepath, 'rb') as f:
                        f.seek(byte_start)
                        self.wfile.write(f.read(byte_end - byte_start + 1))
                    return
                else:
                    # Send full file
                    self.send_response(200)
                    self.send_header('Content-Type', 'audio/mpeg' if self.path.endswith('.mp3') else 'audio/wav')
                    self.send_header('Content-Length', str(file_size))
                    self.send_header('Accept-Ranges', 'bytes')
                    self.end_headers()
                    
                    with open(filepath, 'rb') as f:
                        self.wfile.write(f.read())
                    return
            except Exception as e:
                self.send_error(500, str(e))
                return
        
        # Default behavior for other files
        super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")

