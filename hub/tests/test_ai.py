import json, os, sys, tempfile, threading, unittest, urllib.request, http.server
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import server as S
from test_hub import call
SEEN = {}
class Fake(http.server.BaseHTTPRequestHandler):  # stands in for Coarena (OpenAI-compatible)
    def log_message(self, *a): pass
    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers['Content-Length']))); SEEN[self.path] = (self.headers.get('Authorization'), b)
        if self.path.endswith('/feedback'): self.send_response(200); self.end_headers(); self.wfile.write(b'{}'); return
        if b.get('stream'):
            self.send_response(200); self.send_header('Content-Type', 'text/event-stream'); self.end_headers()
            for t in ('سلام', ' دنیا'): self.wfile.write(('data: ' + json.dumps({'id': 'req_9', 'choices': [{'delta': {'content': t}}]}) + '\n\n').encode())
            self.wfile.write(b'data: [DONE]\n\n'); return
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers()
        self.wfile.write(json.dumps({'id': 'req_1', 'choices': [{'message': {'content': 'پاسخ'}}]}).encode())
class A(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fake = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Fake); threading.Thread(target=cls.fake.serve_forever, daemon=True).start()
        cls.tmp = tempfile.TemporaryDirectory(); cfg = dict(S.DEF)
        cfg.update(port=0, data_dir=cls.tmp.name, ai_url='http://127.0.0.1:%d/api/v1' % cls.fake.server_address[1], ai_key='coa_test', ai_model='claude-sonnet-5-5', ai_rate_per_min=50)
        cls.srv = S.make_server(cfg); cls.base = 'http://127.0.0.1:%d' % cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start(); hub = cls.srv.hub
        c = hub.q("INSERT INTO users(code,name,role,created) VALUES('admin','a','admin',0)"); hub.set_pin(c.lastrowid, '12345678')
        cls.tok = call(cls.base, 'POST', '/api/v1/auth/login', {'code': 'admin', 'pin': '12345678'})[1]['token']
    @classmethod
    def tearDownClass(cls): cls.srv.shutdown(); cls.fake.shutdown(); cls.tmp.cleanup()
    def test_plain_stream_feedback(self):
        s, r = call(self.base, 'POST', '/api/v1/ai', {'system': 'sys', 'prompt': 'hi'}, self.tok); self.assertEqual((s, r['text'], r['id']), (200, 'پاسخ', 'req_1'))
        auth, body = SEEN['/api/v1/chat/completions']; self.assertEqual(auth, 'Bearer coa_test'); self.assertEqual(body['model'], 'claude-sonnet-5-5'); self.assertEqual(body['messages'][0]['role'], 'system')
        req = urllib.request.Request(self.base + '/api/v1/ai/stream', json.dumps({'messages': [{'role': 'user', 'content': 'hi'}], 'model': 'claude-haiku-5-5'}).encode(), {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.tok})
        out = urllib.request.urlopen(req, timeout=10).read().decode(); self.assertIn('سلام', out.encode().decode('unicode_escape') if '\\u' in out else out); self.assertIn('"id": "req_9"', out)
        self.assertEqual(SEEN['/api/v1/chat/completions'][1]['model'], 'claude-haiku-5-5')
        s, r = call(self.base, 'POST', '/api/v1/ai/feedback', {'request_id': 'req_9', 'rating': 'up'}, self.tok); self.assertEqual(s, 200)
        self.assertEqual(SEEN['/api/v1/feedback'][1], {'request_id': 'req_9', 'rating': 'up'})
if __name__ == '__main__': unittest.main()
