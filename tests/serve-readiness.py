"""Local-only cold/slow/error server for exercising the real entry gate."""
import argparse
import functools
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8766)
parser.add_argument('--mode', choices=['slow', 'error'], default='slow')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if args.mode == 'error' and self.path.startswith('/video/kalimba-hero.mp4'):
            self.send_error(503, 'Deliberate local loading test')
        else:
            super().do_GET()

    def copyfile(self, source, outputfile):
        if args.mode == 'slow' and self.path.startswith('/video/'):
            while chunk := source.read(65536):
                outputfile.write(chunk)
                outputfile.flush()
                time.sleep(0.05)
        else:
            super().copyfile(source, outputfile)

    def log_message(self, *args):
        pass


ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=root)).serve_forever()
