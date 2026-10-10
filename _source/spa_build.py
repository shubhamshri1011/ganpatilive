"""Builds the Ganpati guide (SPA at /ganpati + 22 prerendered mandal pages) and exports data/site.json for build.mjs."""
import re,json,os,shutil,sys,datetime,html as H
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE)
import seo_data as S
from seo_data import SITE,FAQ,PAGES,FEST,BWU
ROOT=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(HERE)
TODAY=os.environ.get('BUILD_DATE') or datetime.date.today().isoformat();S.TODAY=TODAY
esc=lambda s:H.escape(str(s),quote=True)
CITIES={'pune':('Pune','Maharashtra',18.5204,73.8567),'bhopal':('Bhopal','Madhya Pradesh',23.2599,77.4126),'mumbai':('Mumbai','Maharashtra',19.076,72.8777),'nashik':('Nashik','Maharashtra',19.9975,73.7898),'nagpur':('Nagpur','Maharashtra',21.1458,79.0882),'indore':('Indore','Madhya Pradesh',22.7196,75.8577)}
CATS={'festival':'Festivals','garba':'Garba & Dandiya','cultural':'Cultural','market':'Markets & Melas','music':'Music & Concerts','workshop':'Workshops'}
NAV9=[['Shailaputri','Orange','#f97316'],['Brahmacharini','White','#f1f5f9'],['Chandraghanta','Red','#dc2626'],['Kushmanda','Royal Blue','#1d4ed8'],['Skandamata','Yellow','#facc15'],['Katyayani','Green','#16a34a'],['Kalaratri','Grey','#6b7280'],['Mahagauri','Purple','#7e22ce'],['Siddhidatri','Peacock Green','#0f766e']]
src=open(os.path.join(HERE,'spa-base.html'),encoding='utf-8').read();M,SEO=S.build(src)
GP=dict(t='Pune Ganpati Mandals: Live Crowd, Map, Metro Routes & Darshan Timing',d='Guide to 22 Pune Ganpati mandals with coordinates, live crowd reports, metro and parking, and emergency helplines. Plan your Ganeshotsav darshan.',h1='Pune Ganpati mandal guide',q='Pune Ganpati LIVE maps 22 Ganpati mandals in Pune with timings, nearest metro, parking, community crowd reports and emergency helplines.')
meta={'/ganpati':dict(t=GP['t'],d=GP['d'])};graphs={}
meta.update({k:v for k,v in SEO['meta'].items() if k.startswith('/pune-ganpati/')})
g=json.loads(json.dumps(SEO['graphs']['/']));wp=g[2];wp.update({"@id":SITE+'/ganpati',"url":SITE+'/ganpati',"name":GP['t'],"description":GP['d']});graphs['/ganpati']=g
for k,v in SEO['graphs'].items():
    if k.startswith('/pune-ganpati/'):
        v=json.loads(json.dumps(v))
        for n in v:
            if n.get('@type')=='BreadcrumbList':
                for it in n['itemListElement']:
                    if it['name']=='Pune Ganpati mandals':it['item']=SITE+'/ganpati'
                    if it['name']=='Home':it['item']=SITE+'/'
        graphs[k]=v
SPA=dict(meta=meta,graphs=graphs)
js=open(os.path.join(HERE,'app_v2.js'),encoding='utf-8').read().replace('__SEO__',json.dumps(SPA,ensure_ascii=False))
h=src;old="window.onload = function() {\n        lucide.createIcons();\n        navigateTo('home');\n    };";assert old in h;h=h.replace(old,'')
i=h.rindex('</script>');h=h[:i]+js+h[i:]
GEO='<meta name="geo.region" content="IN-MH"><meta name="geo.placename" content="Pune"><meta name="geo.position" content="18.5204;73.8567"><meta name="ICBM" content="18.5204, 73.8567">'
h=re.sub(r'<title>.*?</title>','<title>'+esc(GP['t'])+'</title>',h,1,re.S);h=re.sub(r'(<meta name="description" content=")[^"]*','\\g<1>'+esc(GP['d']),h,1)
h=h.replace('<meta property="og:type" content="website">','<meta property="og:type" content="website"><meta property="og:url" content="%s/ganpati"><meta property="og:site_name" content="Pune Ganpati LIVE"><meta name="twitter:card" content="summary"><meta name="twitter:title" content=""><meta name="twitter:description" content=""><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">%s<meta name="theme-color" content="#1b1740"><link rel="alternate" type="text/plain" href="/llms.txt">'%(SITE,GEO),1)
h=h.replace('<link rel="canonical" href="https://puneganpatilive.in/">','<link rel="canonical" href="%s/ganpati">'%SITE).replace('content="mr_IN"','content="en_IN"').replace('<html lang="mr">','<html lang="en-IN">')
h=h.replace('</style>','summary{list-style:none}summary::-webkit-details-marker{display:none}a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}</style>',1)
a='<nav class="hidden md:flex items-center gap-1 font-semibold text-sm">';assert a in h
h=h.replace(a,a+'<a href="/" class="nav-btn px-3 py-2 rounded-lg hover:bg-white/10">Events home</a><a href="/events" class="nav-btn px-3 py-2 rounded-lg hover:bg-white/10">All events</a>',1)
h=h.replace('Built for Pune Pilgrims • No Tracking • Privacy First','Built for Pune pilgrims • Some links are sponsored • <a href="/about" class="underline">Privacy and advertise</a>')
fl=''.join(f'<a href="/pune-ganpati/{m["id"]}" onclick="event.preventDefault();navigateTo(\'mandal\',\'{m["id"]}\')" class="hover:underline">{m["name"]}</a>' for m in M)
h=h.replace('</footer>',f'<div class="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-800 text-xs"><nav class="flex flex-wrap gap-x-4 gap-y-2 text-slate-300 font-medium"><a href="/" class="hover:underline">Pune events</a><a href="/events/pune" class="hover:underline">Events in Pune</a><a href="/navratri" class="hover:underline">Navratri 2026</a><a href="/diwali" class="hover:underline">Diwali 2026</a><a href="/list-your-event" class="hover:underline">List your event</a><a href="/about" class="hover:underline">About</a></nav><details class="mt-4"><summary class="cursor-pointer text-slate-500">All Ganpati mandals</summary><nav class="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-slate-400">{fl}</nav></details></div></footer>',1)
def spa(path):
    m={k:esc(v) for k,v in meta[path].items()};url=SITE+path;x=h
    x=re.sub(r'<title>.*?</title>','<title>'+m['t']+'</title>',x,1,re.S);x=re.sub(r'(<meta name="description" content=")[^"]*','\\g<1>'+m['d'],x,1)
    x=x.replace('<link rel="canonical" href="%s/ganpati">'%SITE,'<link rel="canonical" href="%s">'%url)
    x=re.sub(r'(<meta property="og:title" content=")[^"]*','\\g<1>'+m['t'],x,1);x=re.sub(r'(<meta property="og:description" content=")[^"]*','\\g<1>'+m['d'],x,1)
    x=x.replace('<meta property="og:url" content="%s/ganpati">'%SITE,'<meta property="og:url" content="%s">'%url).replace('<meta name="twitter:title" content="">','<meta name="twitter:title" content="%s">'%m['t']).replace('<meta name="twitter:description" content="">','<meta name="twitter:description" content="%s">'%m['d'])
    sch=json.dumps({"@context":"https://schema.org","@graph":graphs[path]},ensure_ascii=False)
    x=re.sub(r'(<script type="application/ld\+json" id="dynamic-schema">).*?(</script>)',lambda mm:mm.group(1)+sch+mm.group(2),x,1,re.S)
    if path=='/ganpati':body=f"<div class='max-w-3xl mx-auto'><h1 class='text-3xl font-black'>{esc(GP['h1'])}</h1><p id='quick-answer' class='mt-3'>{esc(GP['q'])}</p></div>"
    else:
        z=next(z for z in M if z['id']==path.split('/')[-1]);body=f"<div class='max-w-3xl mx-auto'><h1 class='text-3xl font-black'>{esc(z['name'])}, Pune</h1><p id='quick-answer' class='mt-3'>{esc(z['name'])} is a {esc(z['cat'])} Ganpati in {esc(z['area'])}, Pune. Address: {esc(z['address'])}. Timings: {esc(z['timings'])}. Nearest metro: {esc(z['metro'])}.</p><p class='mt-3'>{esc(z['desc'])}</p></div>"
    return re.sub(r'(<main id="app-content"[^>]*>)',lambda mm:mm.group(1)+body,x,1)
P=os.path.join(ROOT,'public');os.makedirs(P+'/pune-ganpati',exist_ok=True);os.makedirs(os.path.join(ROOT,'data'),exist_ok=True)
open(P+'/ganpati.html','w',encoding='utf-8').write(spa('/ganpati'))
for m in M:open(P+f"/pune-ganpati/{m['id']}.html",'w',encoding='utf-8').write(spa('/pune-ganpati/'+m['id']))
org=SEO['graphs']['/'][:2]
site=dict(SITE=SITE,CITIES=CITIES,CATS=CATS,FEST=FEST,FAQ=FAQ,PAGES={k:v for k,v in PAGES.items() if k in('/navratri','/diwali','/about')},NAV9=NAV9,BWU=BWU,ORG=org,GP=GP,MANDALS=[dict(id=m['id'],name=m['name'],area=m['area'],cat=m['cat']) for m in M])
json.dump(site,open(os.path.join(ROOT,'data/site.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(['/ganpati']+['/pune-ganpati/'+m['id'] for m in M],open(os.path.join(ROOT,'data/static-urls.json'),'w'))
print('ganpati guide:',len(M)+1,'pages; site.json written')
