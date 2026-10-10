import os,re,json,sys
root=sys.argv[1];files=[];bad=[]
for r,_,fs in os.walk(root):
    for f in fs:
        if f.endswith('.html'):files.append(os.path.join(r,f))
def exists(u):
    u=u.split('#')[0].split('?')[0]
    if u in('','/'):return os.path.exists(root+'/index.html')
    return os.path.exists(root+u) or os.path.exists(root+u+'.html')
n=0
for p in files:
    t=open(p,encoding='utf-8').read()
    for m in re.finditer(r'<script type="application/ld\+json"[^>]*>(.*?)</script>',t,re.S):
        try:json.loads(m.group(1))
        except Exception as e:bad.append((p,'jsonld',str(e)[:60]))
    for u in re.findall(r'href="(/[^"]*)"',t):
        n+=1
        if not exists(u):bad.append((p,'link',u))
    if p.endswith('admin.html'):continue
    if '<h1' not in t and 'ganpati' not in p:bad.append((p,'noh1',''))
    if len(re.findall(r'<title>',t))!=1:bad.append((p,'title',''))
print(len(files),'pages,',n,'links,',len(bad),'problems');[print(b) for b in bad[:12]]
