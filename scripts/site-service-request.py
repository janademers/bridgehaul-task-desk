"""Call this private Site with a runtime-only token. JSON is read from hidden stdin."""
import json,sys,urllib.request,urllib.error
try:
 import termios
 if sys.stdin.isatty():
  attrs=termios.tcgetattr(sys.stdin);attrs[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin,termios.TCSANOW,attrs)
except ImportError:pass
print('Ready for private Site request JSON on stdin (input is hidden).',flush=True)
b=json.loads(sys.stdin.readline());origin=b['origin'].rstrip('/');results=[]
for item in b['requests']:
 path=item['path']
 if not path.startswith('/') or path.startswith('//'):raise ValueError('Use same-site relative paths')
 data=json.dumps(item['body']).encode() if 'body' in item else None
 req=urllib.request.Request(origin+path,data=data,method=item.get('method','POST' if data else 'GET'),headers={'OAI-Sites-Authorization':'Bearer '+b['token'],'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=40) as r: result={'path':path,'status':r.status,'body':json.load(r)}
 except urllib.error.HTTPError as e:
  result={'path':path,'status':e.code,'body':e.read().decode()[:500]}
 results.append(result)
print(json.dumps(results))
