import json,re
SITE='https://www.puneganpatilive.in'
TODAY='2026-10-10'
BWU='https://www.blinkwear.in/products?type=rent&utm_source=puneganpatilive&utm_medium=referral&utm_campaign='
FEST=[
 dict(id='navratri-2026',name='Sharad Navratri 2026',start='2026-10-11',end='2026-10-19',label='11-19 Oct',desc='Nine nights of Devi worship, garba and dandiya, starting with Ghatasthapana on Sunday 11 October.'),
 dict(id='dussehra-2026',name='Vijayadashami (Dussehra) 2026',start='2026-10-20',end='2026-10-20',label='20 Oct',desc='Dussehra falls on Tuesday 20 October 2026, the day after Navratri ends.'),
 dict(id='dhanteras-2026',name='Dhanteras 2026',start='2026-11-06',end='2026-11-06',label='6 Nov',desc='First day of the Diwali festival; popular for buying gold, utensils and new items.'),
 dict(id='diwali-2026',name='Diwali (Lakshmi Puja) 2026',start='2026-11-08',end='2026-11-08',label='8 Nov',desc='Diwali Lakshmi Puja on Sunday 8 November 2026. Puja muhurat varies by panchang.'),
 dict(id='govardhan-2026',name='Govardhan Puja 2026',start='2026-11-10',end='2026-11-10',label='10 Nov',desc='Govardhan Puja, the day after Diwali.'),
 dict(id='bhaidooj-2026',name='Bhai Dooj 2026',start='2026-11-11',end='2026-11-11',label='11 Nov',desc='Bhai Dooj on Wednesday 11 November 2026.'),
]
FAQ={
'navratri':[
 ['When is Navratri 2026 in Pune?','Sharad Navratri 2026 starts on Sunday 11 October with Ghatasthapana and runs nine nights to Monday 19 October. Vijayadashami (Dussehra) is on Tuesday 20 October 2026.'],
 ['What are the nine Navratri colours for 2026?','Day 1 to Day 9: Orange, White, Red, Royal Blue, Yellow, Green, Grey, Purple and Peacock Green. Colour conventions can differ slightly by region.'],
 ['Where can I find garba and dandiya events in Pune?','Pune Ganpati LIVE lists community-submitted garba and dandiya events with venue, date, time and booking link. Organisers can submit an event for free by email. Always confirm timings and entry rules with the organiser.'],
 ['Where can I rent a garba outfit or chaniya choli in Pune?','BlinkWear.in is a fashion rental marketplace with a hub in Pune. It offers festive lehengas and Navratri looks with rentals from Rs 499 per day, doorstep delivery and pickup. Check current availability on the BlinkWear website.'],
 ['Which Devi temples can I visit in Pune during Navratri?','Well-known options include Chaturshringi Mata Mandir on Senapati Bapat Road and the Tambdi Jogeshwari temple in the old city. Expect long queues on weekends and on Ashtami; check the temple trust for darshan timings.'],
],
'diwali':[
 ['When is Diwali 2026?','Diwali (Lakshmi Puja) is on Sunday 8 November 2026. Dhanteras is on 6 November, Govardhan Puja on 10 November and Bhai Dooj on 11 November. Puja muhurat varies by panchang.'],
 ['Where to shop for Diwali in Pune?','Laxmi Road, Tulshibaug and the Peth-area markets are traditional festive shopping areas for clothes, lamps, decor and puja items. Evenings are crowded with traffic diversions, so the metro is the easiest way into the old city.'],
 ['Where can I rent festive outfits for Diwali parties in Pune?','BlinkWear.in rents designer lehengas, ethnic wear and dresses with doorstep delivery and pickup, with rentals from Rs 499 per day. Check availability for your date on the BlinkWear website.'],
],
'events':[
 ['Which festivals are coming up in Pune in October and November 2026?','Sharad Navratri (11-19 October), Dussehra (20 October), Dhanteras (6 November), Diwali (8 November), Govardhan Puja (10 November) and Bhai Dooj (11 November).'],
 ['How do I list my event on Pune Ganpati LIVE?','Use the submit form on this page or email shubhamshri.1110@gmail.com with the event name, venue, date, time, price and booking link. Basic listings are free; featured placement is available.'],
 ['Is Ganeshotsav 2026 over?','Yes. Ganeshotsav 2026 has ended, but mandal timings, locations, metro routes and emergency information stay available in the directory for planning next year.'],
]}
PAGES={
'/':dict(t='Pune Ganpati LIVE - Pune Festival Guide: Ganpati, Navratri, Diwali Events and Maps',d='Pune festival guide: Ganpati mandal maps and routes, Navratri 2026 garba and dandiya events, Diwali dates and shopping, plus metro, parking and emergency help.',h1='Pune festival guide',q='Pune Ganpati LIVE is a community guide to Pune festivals: Ganpati mandals with maps and metro routes, Navratri 2026 events (11-19 October), Diwali 2026 (8 November) and emergency helplines.'),
'/navratri':dict(t='Pune Navratri 2026: Garba & Dandiya Events, Dates, Colours',d='Navratri 2026 in Pune: 11-19 Oct dates, nine-day colour guide, garba and dandiya events, Devi temples and festive outfit rentals. Updated daily.',h1='Navratri 2026 in Pune',q='Sharad Navratri 2026 runs from Sunday 11 October to Monday 19 October, with Dussehra on 20 October. This guide covers the nine-day colours, garba and dandiya events in Pune, Devi temples and where to rent festive outfits.',faq='navratri'),
'/events':dict(t='Pune Festival Events Calendar 2026: Navratri, Dussehra, Diwali',d='Pune festival calendar for October and November 2026 with exact dates for Navratri, Dussehra, Dhanteras, Diwali and Bhai Dooj, plus community event listings.',h1='Pune festival events 2026',q='Upcoming festivals in Pune: Navratri 11-19 October, Dussehra 20 October, Dhanteras 6 November, Diwali 8 November, Govardhan Puja 10 November and Bhai Dooj 11 November 2026.',faq='events'),
'/diwali':dict(t='Pune Diwali 2026: Dates, Shopping Markets & Festive Outfits',d='Diwali 2026 in Pune: Dhanteras 6 Nov, Lakshmi Puja 8 Nov, where to shop for decor and puja items, and festive outfit rentals with doorstep delivery.',h1='Diwali 2026 in Pune',q='Diwali (Lakshmi Puja) 2026 is on Sunday 8 November, with Dhanteras on 6 November. Laxmi Road, Tulshibaug and the Peth markets are the classic places to shop in Pune.',faq='diwali'),
'/about':dict(t='About, Privacy & Advertise - Pune Ganpati LIVE',d='About Pune Ganpati LIVE, how it handles data, affiliate and sponsored link disclosure, and how to advertise or list an event.',h1='About, privacy and advertising',q='Pune Ganpati LIVE is an independent community guide for Pune festivals. Some links are affiliate or sponsored; this page explains data use and how to advertise.'),
}
def parse_mandals(html):
    i=html.index('const MANDALS_DATA = [');blk=html[i:html.index('\n    ];',i)]
    parts=re.split(r'\n\s+\{\s*\n\s+id:',blk)[1:];out=[]
    for p in parts:
        g=lambda k:(re.search(r'\b'+k+r':\s*"([^"]*)"',p) or [None,''])[1]
        n=lambda k:float(re.search(k+r':\s*([\d.]+)',p).group(1))
        out.append(dict(id=re.match(r'\s*"([^"]+)"',p).group(1),name=g('name'),area=g('area'),address=g('address'),lat=n('latitude'),lng=n('longitude'),desc=g('description'),timings=g('timings'),cat=g('category'),metro=g('metro'),bus=g('bus')))
    return out
def build(html):
    M=parse_mandals(html);meta={};graphs={}
    org={"@type":"Organization","@id":SITE+"/#org","name":"Pune Ganpati LIVE","url":SITE+"/","email":"shubhamshri.1110@gmail.com","areaServed":{"@type":"City","name":"Pune","geo":{"@type":"GeoCoordinates","latitude":18.5204,"longitude":73.8567}}}
    web={"@type":"WebSite","@id":SITE+"/#web","url":SITE+"/","name":"Pune Ganpati LIVE","inLanguage":["en-IN","mr-IN","hi-IN"],"publisher":{"@id":SITE+"/#org"}}
    def crumbs(items):return {"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":i+1,"name":n,"item":SITE+u} for i,(n,u) in enumerate(items)]}
    def faq(k):return {"@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}} for q,a in FAQ[k]]}
    def ev(f):return {"@type":"Event","name":f['name'],"description":f['desc'],"startDate":f['start'],"endDate":f['end'],"eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode","location":{"@type":"Place","name":"Pune","address":{"@type":"PostalAddress","addressLocality":"Pune","addressRegion":"MH","addressCountry":"IN"}},"organizer":{"@id":SITE+"/#org"}}
    for p,v in PAGES.items():
        meta[p]=dict(t=v['t'],d=v['d'])
        wp={"@type":"WebPage","@id":SITE+p,"url":SITE+(p if p!='/' else '/'),"name":v['t'],"description":v['d'],"isPartOf":{"@id":SITE+"/#web"},"about":{"@type":"Place","name":"Pune, Maharashtra, India"},"inLanguage":"en-IN","dateModified":TODAY,"speakable":{"@type":"SpeakableSpecification","cssSelector":["#quick-answer","h1"]}}
        g=[org,web,wp]
        if p!='/':g.append(crumbs([('Home','/'),(v['h1'],p)]))
        if v.get('faq'):g.append(faq(v['faq']))
        if p=='/navratri':g+= [ev(f) for f in FEST[:2]]
        if p=='/diwali':g+= [ev(f) for f in FEST[2:]]
        if p=='/events':g+= [ev(f) for f in FEST]
        graphs[p]=g
    for m in M:
        p='/pune-ganpati/'+m['id']
        meta[p]=dict(t=f"{m['name']} Pune: Darshan Timing, Crowd, Metro & Route",d=f"{m['name']} in {m['area']}, Pune. Timings: {m['timings']}. Live crowd reports, nearest metro and bus, address and map.")
        pl={"@type":["Place","TouristAttraction"],"@id":SITE+p+"#place","name":m['name'],"description":m['desc'],"address":{"@type":"PostalAddress","streetAddress":m['address'],"addressLocality":"Pune","addressRegion":"MH","addressCountry":"IN"},"geo":{"@type":"GeoCoordinates","latitude":m['lat'],"longitude":m['lng']},"publicAccess":True,"url":SITE+p}
        wp={"@type":"WebPage","@id":SITE+p,"url":SITE+p,"name":meta[p]['t'],"description":meta[p]['d'],"isPartOf":{"@id":SITE+"/#web"},"mainEntity":{"@id":SITE+p+"#place"},"dateModified":TODAY}
        graphs[p]=[org,web,wp,pl,crumbs([('Home','/'),('Pune Ganpati mandals','/'),(m['name'],p)])]
    return M,dict(meta=meta,graphs=graphs,faq=FAQ,pages={k:dict(h1=v['h1'],q=v['q']) for k,v in PAGES.items()},fest=FEST)
