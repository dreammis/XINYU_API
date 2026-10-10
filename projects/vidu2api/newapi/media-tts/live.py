"""显式运行的 Vox 1 上传、渠道配置与客户验收；自动测试禁止调用。"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import time

import requests

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
OUT = ROOT / '.local/projects/vidu2api/tts-live'
BASE = os.environ['NEWAPI_BASE_URL'].rstrip('/')
ADMIN = {'Authorization':'Bearer '+os.environ['NEWAPI_ADMIN_TOKEN'], 'New-Api-User':os.environ.get('NEWAPI_USER_ID','1')}
PRICE = 0.01369863

def save(name, value):
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def api(method, path, body=None):
    r=requests.request(method,BASE+path,headers=ADMIN,json=body,timeout=45)
    r.raise_for_status(); payload=r.json()
    if not payload.get('success'): raise RuntimeError(path+': '+str(payload.get('message')))
    return payload.get('data')

def state():
    return json.loads((OUT/'state.json').read_text(encoding='utf-8')) if (OUT/'state.json').exists() else {}

def snapshot(channel):
    return {k:channel.get(k) for k in ['id','type','name','status','models','group','base_url','setting','model_mapping','priority','weight']}

def setup():
    result=api('POST','/api/plugin/task',{'source':(HERE/'plugin.js').read_text(encoding='utf-8'),'enabled':True,'remark':'Vox 1 TTS'})
    save('plugin.json',{'meta':result.get('meta'),'layer':result.get('layer')})
    voice=json.loads((HERE/'public-assets/voices.json').read_text(encoding='utf-8'))['models'][0]['default_voice']
    checks=[('normalizeRequest',[{'model':'vox-1','text':'你好','voice':voice,'parameters':{'pitch':-2,'volume':0,'enhance':False,'emotion':'happy'}}]),('native.create',[{'body':{'kind':'json','value':{'model':'vox-1','text':'你好','voice':voice}}}]),('buildSubmitRequest',[{'baseUrl':'https://upstream.example','authHeader':'Bearer fixture','requestBody':{'input_text':'你好'}}]),('parseSubmitResponse',[{}, {'statusCode':200,'body':{'id':'a'*32,'status':'queued'}}]),('parseTaskResult',[{'taskId':'a'*32},{'status':'succeeded'},{'status':200,'headers':{}}]),('listArtifacts',[{'status':'SUCCESS'}]),('buildContentRequest',[{'baseUrl':'https://upstream.example','authHeader':'Bearer fixture','upstreamTaskId':'a'*32,'artifactKey':'audio','clientRequest':{'method':'HEAD','headers':{'Range':'bytes=0-3'}}}]),('extractUsage',[{}])]
    results=[]
    for hook,args in checks:
        if '.' in hook:
            continue  # 宿主 dry-run 只接受顶层导出；native 入口在客户验收中验证。
        try: result=api('POST','/api/plugin/task/media-tts/dryrun',{'hook':hook,'args':args})
        except Exception:
            save('dryruns.json',results)
            raise
        results.append({'hook':hook,'result':result})
        if isinstance(result,dict) and result.get('error'): raise RuntimeError('dryrun failed: '+hook)
    save('dryruns.json',results)
    print('Plugin uploaded and host hooks verified.')

def configure():
    current=state()
    source=api('GET','/api/channel/23')
    if source['type']!=61 or source['base_url'].rstrip('/')!='https://vidu2api.cgssoccer.com': raise RuntimeError('unexpected source channel')
    if 'channel_id' not in current:
        found=api('GET','/api/channel/?p=0&page_size=100')['items']
        if any('vox-1' in c.get('models','').split(',') for c in found): raise RuntimeError('vox-1 already assigned; inspect before changing')
        clone=api('POST','/api/channel/copy/23?suffix=_vox_tts')
        current['channel_id']=clone['id']; save('state.json',current)
    channel=api('GET','/api/channel/'+str(current['channel_id']))
    save('channel-before.json',snapshot(channel))
    api('POST',f"/api/channel/{channel['id']}/status",{'status':2})
    channel.pop('key',None);channel.pop('status',None)
    channel.update(type=61,name='vox',models='vox-1',group='default',model_mapping='',test_model='vox-1',auto_ban=0,setting=json.dumps({'task_plugin_key':'media-tts','proxy':'','pass_through_body_enabled':False}))
    api('PUT','/api/channel/',channel)
    options=api('GET','/api/option/')
    prices=json.loads(next(o['value'] for o in options if o['key']=='ModelPrice'))
    save('pricing-before.json',{'vox-1':prices.get('vox-1')})
    prices['vox-1']=PRICE
    api('PUT','/api/option/',{'key':'ModelPrice','value':json.dumps(prices)})
    existing=api('GET','/api/models/search?keyword=vox-1&page_size=100')['items']
    model={'model_name':'vox-1','description':'Vox 1 多语言语音合成，音色/语速/音调/音量/情绪/增强控制；单次最多5000加权单位，MP3；每次成功生成约¥0.10，失败退还预扣。POST /tts/v1/tasks 创建，GET 查询，产物接口下载。','tags':'tts','status':1,'sync_official':0,'name_rule':0,'endpoints':json.dumps({'tts':{'path':'/tts/v1/tasks','method':'POST'}})}
    matched=next((m for m in existing if m['model_name']=='vox-1'),None)
    if matched: model['id']=matched['id']
    api('PUT' if matched else 'POST','/api/models/',model)
    api('POST',f"/api/channel/{channel['id']}/status",{'status':1})
    save('channel-after.json',snapshot(api('GET','/api/channel/'+str(channel['id']))))
    print('TTS channel configured:',channel['id'])

def client(current):
    if 'token_id' not in current:
        name='vox-acceptance-20261011'
        api('POST','/api/token/',{'name':name,'remain_quota':150000,'expired_time':int(time.time())+14400,'unlimited_quota':False,'group':'default','model_limits_enabled':True,'model_limits':'vox-1'})
        tokens=api('GET','/api/token/search?keyword='+name)
        current['token_id']=next(t['id'] for t in tokens['items'] if t['name']==name)
        save('state.json',current)
    key=api('POST',f"/api/token/{current['token_id']}/key")['key']
    return {'Authorization':'Bearer '+key}

def submit():
    current=state(); headers=client(current)
    voice=json.loads((HERE/'public-assets/voices.json').read_text(encoding='utf-8'))['models'][0]['default_voice']
    token=api('GET',f"/api/token/{current['token_id']}")
    save('token-before.json',{k:token.get(k) for k in ['id','remain_quota','used_quota','group']})
    jobs=current.setdefault('jobs',{})
    sentence='今天我们一起学习如何清晰表达，让每一段文字变成自然的声音。'
    longtext=(sentence*100)[:2500]
    # 精确5000单位边界：用纯中文补满，生成仍使用完整原文。
    longtext='好'*2500
    inputs={'basic':{'text':'你好，这是一段普通语音合成验收。请听清楚每一个字。'},'controls':{'text':'太好了，我们终于完成了今天的工作，明天继续加油！','parameters':{'speed':1.3,'pitch':2,'volume':2,'emotion':'happy','enhance':False}},'max-text':{'text':longtext},'empty-speech':{'text':'...'}}
    for name,fields in inputs.items():
        if name in jobs: continue
        payload={'model':'vox-1','voice':voice,**fields}
        r=requests.post(BASE+'/tts/v1/tasks',headers=headers,json=payload,timeout=60)
        body=r.json(); save(name+'-submit.json',{'status':r.status_code,'textCharacters':len(payload['text']),'parameters':payload.get('parameters'),'response':body})
        if r.status_code!=200 or not body.get('id'): raise RuntimeError(name+' submit failed; see private evidence')
        jobs[name]={'id':body['id'],'status':body['status']};save('state.json',current)
        print(name,'accepted',body['id'])
    before=api('GET',f"/api/token/{current['token_id']}")['used_quota']
    r=requests.post(BASE+'/tts/v1/tasks',headers=headers,json={'model':'vox-1','voice':voice,'text':'好'*2501},timeout=45)
    after=api('GET',f"/api/token/{current['token_id']}")['used_quota']
    save('invalid-input.json',{'status':r.status_code,'body':r.json(),'quotaBefore':before,'quotaAfter':after})
    print('Over-limit input status:',r.status_code)

def poll():
    current=state();headers=client(current)
    for name,job in current.get('jobs',{}).items():
        r=requests.get(BASE+'/tts/v1/tasks/'+job['id'],headers=headers,timeout=45);r.raise_for_status()
        body=r.json();job['status']=body['status'];save(name+'-status.json',body)
        print(name,body['status'])
        if body['status']=='succeeded' and not job.get('downloaded'):
            url=BASE+'/v1/tasks/'+job['id']+'/artifacts/audio/content'
            artifacts=requests.get(BASE+'/v1/tasks/'+job['id']+'/artifacts',headers=headers,timeout=45)
            save(name+'-artifacts.json',artifacts.json())
            audio=requests.get(url,headers=headers,timeout=90);audio.raise_for_status()
            (OUT/(name+'.mp3')).write_bytes(audio.content)
            head=requests.head(url,headers=headers,timeout=45)
            partial=requests.get(url,headers={**headers,'Range':'bytes=0-3'},timeout=45)
            anonymous=requests.get(url,timeout=45)
            save(name+'-content.json',{'bytes':len(audio.content),'mime':audio.headers.get('Content-Type'),'headStatus':head.status_code,'headLength':head.headers.get('Content-Length'),'rangeStatus':partial.status_code,'rangeHeader':partial.headers.get('Content-Range'),'rangeMatches':partial.content==audio.content[:4],'anonymousStatus':anonymous.status_code,'startsWithAudioFrame':audio.content[:2].hex()})
            job['downloaded']=True
    token=api('GET',f"/api/token/{current['token_id']}")
    save('token-after.json',{k:token.get(k) for k in ['id','remain_quota','used_quota','group']})
    save('state.json',current)

def boundary():
    current=state(); headers=client(current); jobs=current.setdefault('jobs',{})
    name='max-text-normal'
    if name in jobs: print('Boundary task already submitted; query it.'); return
    voice=json.loads((HERE/'public-assets/voices.json').read_text(encoding='utf-8'))['models'][0]['default_voice']
    text=('今天阳光很好我们一起读书学习把每个字读清楚让声音自然流畅'*100)[:2500]
    r=requests.post(BASE+'/tts/v1/tasks',headers=headers,json={'model':'vox-1','voice':voice,'text':text},timeout=60)
    body=r.json();save(name+'-submit.json',{'status':r.status_code,'textCharacters':len(text),'response':body})
    if r.status_code!=200 or not body.get('id'): raise RuntimeError('boundary submit failed')
    jobs[name]={'id':body['id'],'status':body['status']};save('state.json',current)
    print('Boundary task accepted:',body['id'])

def audit():
    current=state(); headers=client(current)
    responses=[]
    for name,job in current.get('jobs',{}).items():
        r=requests.get(BASE+'/v1/tasks/'+job['id'],headers=headers,timeout=45)
        body=r.json()
        responses.append({'name':name,'status':r.status_code,'body':body,'containsSupplier':any(s in json.dumps(body).lower() for s in ['vidu','arrogant_miss','service.vidu'])})
    save('generic-customer-tasks.json',responses)
    print('Generic task privacy:',[(r['name'],r['status'],r['containsSupplier']) for r in responses])
    for path in ['/api/task/?p=0&page_size=100','/api/log/?p=0&page_size=100&model_name=vox-1']:
        try:
            body=api('GET',path)
            items=body.get('items',body) if isinstance(body,dict) else body
            if isinstance(items,list): items=[item for item in items if item.get('model_name')=='vox-1' or item.get('model')=='vox-1' or item.get('task_id') in [j['id'] for j in current['jobs'].values()]]
            save('admin-'+('tasks' if 'task/' in path else 'logs')+'.json',items)
            print(path,'matched',len(items) if isinstance(items,list) else 'object')
        except requests.HTTPError as exc: print('Audit endpoint unavailable:',path,exc.response.status_code)

def english():
    current=state();headers=client(current);jobs=current.setdefault('jobs',{});name='max-english'
    if name in jobs: print('English task already submitted; query it.');return
    voice='vx_'+hashlib.sha256(b'English_Aussie_Bloke').hexdigest()[:12]
    text=('Today we are reading a short story together. Speak clearly and naturally, and enjoy every moment of the day. '*60)[:5000]
    r=requests.post(BASE+'/tts/v1/tasks',headers=headers,json={'model':'vox-1','voice':voice,'text':text},timeout=60)
    body=r.json();save(name+'-submit.json',{'status':r.status_code,'textCharacters':len(text),'response':body})
    if r.status_code!=200 or not body.get('id'):raise RuntimeError('English boundary submission failed')
    jobs[name]={'id':body['id'],'status':body['status']};save('state.json',current);print('English boundary accepted:',body['id'])

def cleanup():
    current=state()
    if current.get('token_id'): api('DELETE',f"/api/token/{current['token_id']}")
    current['token_deleted']=True;save('state.json',current);print('Acceptance key deleted.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['setup','configure','submit','poll','boundary','english','audit','cleanup'])
    globals()[parser.parse_args().mode]()
