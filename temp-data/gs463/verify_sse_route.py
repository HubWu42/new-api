import datetime
import json
import os
from pathlib import Path
import signal
import subprocess
import time
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'evidence' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
OUT.mkdir(parents=True)
PREFIX = 'gs464-' + str(os.getpid())
IMAGE = 'calciumion/new-api@sha256:3293fc3d13bbf243ae720d9c4e0b8049e8ed01f5c130d3bdcdad8a1a2c7e57ed'
containers = []
local = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def save(name, value):
    (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2))

def docker(*args, input=None, check=True):
    p = subprocess.run(['docker',*args],input=input,text=True,capture_output=True)
    if check and p.returncode:
        raise RuntimeError(p.stderr)
    return p.stdout.strip()

def start(role,image,*args):
    name = PREFIX+'-'+role
    containers.append(name)
    docker('run','-d','--name',name,'--network',PREFIX,'--network-alias',role,*args,image)
    return name

def request(url, body=None, token=False):
    headers = {'Content-Type':'application/json'}
    if token:
        headers['Authorization']='Bearer sk-'+('a'*48)
    req = urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers=headers)
    try:
        res = local.open(req,timeout=25)
    except urllib.error.HTTPError as e:
        res = e
    with res:
        return {'status':res.code,'headers':dict(res.headers),'body':res.read().decode()}

def sql(query):
    return docker('exec','-i',PREFIX+'-pg','psql','-U','audit','-d','audit','-v','ON_ERROR_STOP=1',input=query)

def ready(url):
    for _ in range(90):
        try:
            if request(url)['status']==200:
                return
        except (OSError,urllib.error.URLError):
            pass
        time.sleep(1)
    raise RuntimeError('gateway startup timed out')

def stop_signal(*_):
    raise KeyboardInterrupt()

signal.signal(signal.SIGTERM,stop_signal)
signal.signal(signal.SIGINT,stop_signal)
try:
    docker('network','create',PREFIX)
    start('pg','postgres:17','-e','POSTGRES_USER=audit','-e','POSTGRES_PASSWORD=synthetic-only','-e','POSTGRES_DB=audit','--tmpfs','/var/lib/postgresql/data')
    start('redis','redis:7')
    fixture = PREFIX+'-fixture'
    containers.append(fixture)
    docker('run','-d','--name',fixture,'--network',PREFIX,'--network-alias','fixture','-v',str(ROOT/'sse_fixture.py')+':/fixture.py:ro','-p','127.0.0.1::8080','-p','127.0.0.1::8081','python:3.12-slim','python3','/fixture.py')
    for _ in range(60):
        if 'accepting connections' in docker('exec',PREFIX+'-pg','pg_isready','-U','audit',check=False):
            break
        time.sleep(1)
    app = start('app',IMAGE,'-p','127.0.0.1::3000','-e','SQL_DSN=postgres://audit:synthetic-only@pg:5432/audit?sslmode=disable','-e','REDIS_CONN_STRING=redis://redis:6379','-e','SESSION_SECRET=synthetic-only-session','-e','ERROR_LOG_ENABLED=false')
    port = docker('port',app,'3000/tcp').rsplit(':',1)[1]
    base = 'http://127.0.0.1:'+port
    ready(base+'/api/status')
    setup = request(base+'/api/setup',{'username':'auditroot','password':'Audit-Only-Strong-2026!','confirmPassword':'Audit-Only-Strong-2026!','SelfUseModeEnabled':False,'DemoSiteEnabled':False})
    assert json.loads(setup['body'])['success'],setup
    sql("""UPDATE users SET quota=1000000 WHERE id=1;
INSERT INTO tokens(user_id,key,status,name,remain_quota,unlimited_quota,created_time,expired_time,"group") VALUES (1,repeat('a',48),1,'synthetic',1000000,false,1,-1,'default');
INSERT INTO channels(id,type,key,status,name,base_url,models,"group",model_mapping,priority,weight,setting,settings,channel_info) VALUES (1,1,'synthetic-only',1,'sse-fixture','http://fixture:8080/missing','gpt-4o','default','{}',0,1,'{}','{}','{}');
INSERT INTO abilities("group",model,channel_id,enabled,priority,weight) VALUES ('default','gpt-4o',1,true,0,1);
INSERT INTO options(key,value) VALUES ('global.chat_completions_to_responses_policy','{"enabled":true,"all_channels":false,"channel_ids":[1],"model_patterns":[".*"]}'),('ModelRatio','{"gpt-4o":1}'),('CompletionRatio','{"gpt-4o":2}') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value;""")
    results = {}
    for mode,upstream_port,expected in [('missing',8080,500),('header',8080,200),('missing',8081,200),('data',8081,200),('json',8081,200),('error',8081,400)]:
        sql("UPDATE channels SET base_url='http://fixture:%s/%s' WHERE id=1;" % (upstream_port,mode))
        docker('restart',app)
        base = 'http://127.0.0.1:'+docker('port',app,'3000/tcp').rsplit(':',1)[1]
        ready(base+'/api/status')
        for stream in (False,True) if mode not in ('json',) else (False,):
            name = '%s-%s-%s' % (upstream_port,mode,'stream' if stream else 'nonstream')
            body = {'model':'gpt-4o','messages':[{'role':'user','content':'synthetic SSE check'}],'stream':stream}
            result = request(base+'/v1/chat/completions',body,True)
            save(name+'.json',{'request':body,'response':result})
            assert result['status']==expected,(name,result)
            if expected==500:
                assert "invalid character 'e'" in result['body'],result
            elif expected==400:
                assert 'synthetic upstream error' in result['body'],result
                if not stream:
                    assert 'text/event-stream' not in result['headers'].get('Content-Type',''),result
                else:
                    results['gateway_stream_error_content_type'] = result['headers'].get('Content-Type')
            elif stream:
                events = [json.loads(line[6:]) for line in result['body'].splitlines() if line.startswith('data: ') and line!='data: [DONE]']
                text = ''.join(c.get('choices',[{}])[0].get('delta',{}).get('content','') for c in events if c.get('choices'))
                assert text=='audit response' and 'data: [DONE]' in result['body'],result
            else:
                assert json.loads(result['body'])['choices'][0]['message']['content']=='audit response',result
            results[name] = result['status']
    # Verify exact pass-through independently of gateway error normalization.
    direct = 'http://127.0.0.1:'+docker('port',fixture,'8080/tcp').rsplit(':',1)[1]
    proxy = 'http://127.0.0.1:'+docker('port',fixture,'8081/tcp').rsplit(':',1)[1]
    for mode in ('json','error','error-sse'):
        a,b = request(direct+'/'+mode+'/responses',{}),request(proxy+'/'+mode+'/responses',{})
        save('passthrough-'+mode+'.json',{'direct':a,'proxy':b})
        assert a['status']==b['status'] and a['body']==b['body'] and a['headers'].get('Content-Type')==b['headers'].get('Content-Type'),(a,b)
        results['passthrough-'+mode]='unchanged'
    github = {}
    for key,path in [('latest_stable','releases/latest'),('releases','releases?per_page=100'),('pr6254','pulls/6254')]:
        url = 'https://api.github.com/repos/QuantumNous/new-api/'+path
        raw = subprocess.run(['curl','--fail','--silent','--show-error','--max-time','60','-H','Accept: application/vnd.github+json',url],text=True,capture_output=True,check=True).stdout
        data = json.loads(raw)
        if key=='releases':
            data = max((r for r in data if not r['draft']),key=lambda r:r['published_at'])
        fields = ('state','merged','merged_at','html_url','title') if key=='pr6254' else ('tag_name','published_at','prerelease','html_url')
        github[key] = {'source':url,**{k:data.get(k) for k in fields}}
    github['checked_at_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    save('github.json',github)
    save('results.json',results)
    save('image.json',json.loads(docker('image','inspect',IMAGE)))
    print(json.dumps({'conclusion':'rc.41 复现 500；上游补头与薄反代的成功分支均成立；薄反代原样透传 JSON/错误。rc.41 网关自身在 stream=true 的 400 错误上仍标 text/event-stream，未修改源码。','unknown':'实际渠道上游身份、可配置性及渠道14是否有使用方：未确认，待 GS-465 的只读盘点结果','results':results,'github':github,'evidence':str(OUT)},ensure_ascii=False,indent=2))
finally:
    for name in containers:
        (OUT/(name.split(PREFIX+'-',1)[-1]+'.log')).write_text(docker('logs',name,check=False))
    for name in reversed(containers):
        docker('rm','-f','-v',name,check=False)
    docker('network','rm',PREFIX,check=False)
    remaining = docker('ps','-aq','--filter','name='+PREFIX)
    networks = docker('network','ls','-q','--filter','name='+PREFIX)
    save('cleanup.json',{'containers':remaining,'networks':networks})
    assert not remaining and not networks,'cleanup failed'
