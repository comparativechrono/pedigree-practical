#!/usr/bin/env python3
"""Serve this folder on http://localhost:PORT so the practical can be tried
on your own computer. (Browsers block the drawing tool when index.html is
opened straight from a file.)
usage:  python3 serve.py [PORT]"""
import os, sys, http.server, socketserver


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # always fetch the latest files while you edit them
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f'Serving on http://localhost:{port}  (Ctrl+C to stop)')
    Server(('127.0.0.1', port), Handler).serve_forever()
