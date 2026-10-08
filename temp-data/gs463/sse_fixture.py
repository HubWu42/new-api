import http.client
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Fixture(BaseHTTPRequestHandler):
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        req = json.loads(raw)
        print(json.dumps({'path': self.path, 'request': req}), flush=True)
        mode = self.path.split('/')[1]
        response = {'id':'resp_audit','object':'response','model':'gpt-4o','status':'completed','output':[{'id':'msg_audit','type':'message','role':'assistant','status':'completed','content':[{'type':'output_text','text':'audit response','annotations':[]}]}], 'usage':{'input_tokens':10,'output_tokens':5,'total_tokens':15}}
        if mode == 'error':
            body = b'{"error":{"message":"synthetic upstream error","type":"invalid_request_error","code":"synthetic_error"}}'
            status, ctype = 400, 'application/json'
        elif mode == 'error-sse':
            body = b'event: error\ndata: synthetic error\n\n'
            status, ctype = 400, 'text/plain'
        elif mode == 'json':
            body = json.dumps(response).encode()
            status, ctype = 200, 'application/json'
        else:
            events = [{'type':'response.output_text.delta','delta':'audit response','output_index':0,'content_index':0}, {'type':'response.completed','response':response}]
            body = ''.join(('' if mode == 'data' else 'event: '+e['type']+'\n')+'data: '+json.dumps(e)+'\n\n' for e in events).encode()
            status, ctype = 200, ('text/event-stream' if mode == 'header' else None)
        self.send_response(status)
        if ctype:
            self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

class Proxy(BaseHTTPRequestHandler):
    # Peek only the prefix; stream the remainder without buffering the response.
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        conn = http.client.HTTPConnection('127.0.0.1',8080,timeout=20)
        try:
            conn.request('POST',self.path,raw,{'Content-Type':self.headers.get('Content-Type','application/json')})
            upstream = conn.getresponse()
            prefix = upstream.read(6)
            repair = 200 <= upstream.status < 300 and prefix.startswith((b'event:',b'data:'))
            self.send_response(upstream.status)
            hop = {'connection','transfer-encoding','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','upgrade'}
            hop.update(x.strip().lower() for x in upstream.getheader('Connection','').split(','))
            for key,value in upstream.getheaders():
                if key.lower() not in hop and not (repair and key.lower() == 'content-type'):
                    self.send_header(key,value)
            if repair:
                self.send_header('Content-Type','text/event-stream')
            self.end_headers()
            self.wfile.write(prefix)
            self.wfile.flush()
            while True:
                chunk = upstream.read1(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        finally:
            conn.close()

threading.Thread(target=ThreadingHTTPServer(('0.0.0.0',8080),Fixture).serve_forever,daemon=True).start()
ThreadingHTTPServer(('0.0.0.0',8081),Proxy).serve_forever()
