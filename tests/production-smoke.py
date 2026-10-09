"""Run only with an explicitly supplied private key file; creates scoped QA records."""
import urllib.request, urllib.error, http.cookiejar, json, hashlib, uuid, os, pathlib
base='https://sg-study-deck.dengana-10011212.workers.dev'
agent='Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def call(path,data=None,auth=True):
 headers={'User-Agent':agent,'Origin':base}
 if data is not None:headers['Content-Type']='application/json'
 req=urllib.request.Request(base+path,headers=headers,data=json.dumps(data,ensure_ascii=False).encode() if data is not None else None)
 try:
  r=(client.open if auth else urllib.request.urlopen)(req,timeout=25)
  return r.status,r.headers,r.read()
 except urllib.error.HTTPError as e:return e.code,e.headers,e.read()
passes=[];created=[]
for path in ['/','/manifest.webmanifest','/icons/icon-192.png','/icons/maskable-512.png','/sw.js']:
 status,headers,raw=call(path,auth=False);assert status==200,(path,status);assert headers.get('X-Robots-Tag')=='noindex, nofollow'
passes.append('Public HTTPS assets and PWA manifest/icons are reachable with security headers')
assert call('/api/backups',auth=False)[0]==401
assert call('/api/login',{'key':'invalid'},auth=False)[0]==401
passes.append('Unauthenticated backup access is denied')
key=pathlib.Path(os.environ['SG_RECOVERY_KEY_FILE']).read_text().splitlines()[2]
status,headers,raw=call('/api/login',{'key':key,'name':'SG deployment QA 20261009'});assert status==200,(status,raw.decode());device=json.loads(raw)['deviceId']
cookie=headers.get('Set-Cookie');assert all(s in cookie for s in ['Secure','HttpOnly','SameSite=Strict','__Host-sg-study-deck='])
passes.append('Production app-specific Secure HttpOnly cookie and D1 authentication work')
payload=json.loads(pathlib.Path('public/data/ipa-verified.json').read_text());q=payload['questions'][0]
settings={'theme':'neon','effects':'high','sound':True,'vibration':True,'master':.8,'bgm':.55,'sfx':.6,'fade':2.5,'autoNext':1.1,'repeat':'all','themeMusic':False,'assignments':{'neon':[],'boss':[],'cyber':[]}}
latest=None
for i in range(6):
 data={'appId':'sg-study-deck','formatVersion':1,'exportedAt':'2026-10-09T00:00:00Z','attempts':[{'attemptId':'deployment-qa-'+str(i),'questionId':q['questionId'],'revision':q['revision'],'sessionId':'deployment-qa-session','answeredAt':'2026-10-09T00:00:00Z','selectedOptionId':q['correctOptionId'],'correct':True,'responseMs':1000,'topicTagsSnapshot':q['topicTags']}],'sessions':[{'sessionId':'deployment-qa-session','activeMs':1000,'mode':'quick','status':'complete'}],'settings':settings}
 text=json.dumps(data,ensure_ascii=False,separators=(',',':'));checksum=hashlib.sha256(text.encode()).hexdigest();operation=str(uuid.uuid4());body={'payload':text,'checksum':checksum,'operationId':operation,'baseId':latest}
 status,_,raw=call('/api/backups/save',body);assert status==200,(status,raw.decode());identity=json.loads(raw)['id'];created.append(identity)
 status,_,raw=call('/api/backups/'+identity);read=json.loads(raw);assert status==200 and read['payload']==text and hashlib.sha256(read['payload'].encode()).hexdigest()==checksum
 assert call('/api/backups/confirm',{'id':identity,'checksum':checksum})[0]==200
 status,_,raw=call('/api/backups/save',body);assert json.loads(raw)['id']==identity
 latest=identity
status,_,raw=call('/api/backups');history=json.loads(raw)['backups'];assert len(history)==5 and history[0]['id']==latest
passes.append('Six real D1 generations: readback hashes, idempotent retries and newest-five retention verified')
assert call('/api/logout',{})[0]==200 and call('/api/status')[0]==401
passes.append('Production device logout immediately revokes access')
pathlib.Path('qa/production-results.json').write_text(json.dumps({'passed':passes,'qaBackupIds':created,'qaDeviceId':device},indent=2))
for p in passes:print('PASS',p)
