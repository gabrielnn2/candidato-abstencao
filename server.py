#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor local para o projeto Eleições 2026 - Candidato Abstenção
Execute com:
    python server.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORTS = [8080, 8000, 5173, 8888, 9000]

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True

def run_server():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)
    handler_class = lambda *args, **kwargs: CustomHTTPHandler(*args, directory=base_dir, **kwargs)
    
    server = None
    chosen_port = None
    
    for port in PORTS:
        try:
            server = socketserver.TCPServer(("", port), handler_class)
            chosen_port = port
            break
        except Exception:
            continue
            
    if not server:
        server = socketserver.TCPServer(("", 0), handler_class)
        chosen_port = server.server_address[1]
        
    url = f"http://localhost:{chosen_port}"
    print("=" * 65, flush=True)
    print("  ELEIÇÕES 2026: E SE A ABSTENÇÃO FOSSE CANDIDATO?", flush=True)
    print("  Análise Eleitoral com Dados Públicos Oficiais do TSE", flush=True)
    print("=" * 65, flush=True)
    print(f"  -> Servidor ativo em: {url}", flush=True)
    print("  -> Pressione Ctrl+C para encerrar.", flush=True)
    print("=" * 65, flush=True)
    
    with server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor finalizado com sucesso.")


if __name__ == "__main__":
    run_server()
