PUNE GANPATI LIVE v4: events-first site + admin panel
======================================================

SETUP (ek baar)
1. Repo ki purani files delete karo (events-data.js, events/, event/, *.html root par), is zip ka content repo root par daalo, push karo.
   Vercel vercel.json se khud settings utha lega (Build: node build.mjs, Output: dist). Framework Preset = Other.
2. Firebase Console > Authentication > Sign-in method > Google ENABLE karo.
   Settings > Authorized domains mein puneganpatilive.in aur www.puneganpatilive.in add karo.
3. Firebase Console > Firestore > Rules: firestore.rules.txt ke blocks apne EXISTING rules ke andar add karo
   (comments aur crowdReports ke purane rules mat hatana). Publish karo.
   Agar aapka Google account shubhamshri.1110@gmail.com nahi hai to rules mein email badlo.
4. Vercel > Project > Settings > Git > Deploy Hooks > ek hook banao (naam: admin). URL copy karo.
5. /admin kholo, Google se login karo, Settings tab mein WhatsApp number daalo.

ROZ KA KAAM (admin panel: /admin)
- Events tab > New event: details bharo. Passes section mein har pass ka naam, price aur payment link daalo.
- Products tab > New product: naam, price, image link, payment link.
- Bulk import tab: Google Sheet se CSV paste karke ek saath bahut events daalo.
- Save ke baad "Publish site" dabao. Pehli baar Deploy Hook URL maangega. Site ~1 minute mein live update hoti hai.
- Event chhupana ho to Edit mein "Published" untick karo (Delete permanent hai).

PAYMENT KAISE LE (bina server ke)
- Razorpay Dashboard > Payment Links > Create. Amount daalo (e.g. Couple Pass Rs 999) > link copy karo.
- Wo link admin mein pass/product ke "payment link" field mein paste karo. Buy button seedha us page par le jaata hai.
- Razorpay KYC aur apne policies pages (/policies) ki zaroorat hoti hai. Text data/policies.json mein edit karo.
- Link nahi diya to Buy button WhatsApp chat khol deta hai (order message ke saath).
- Limitation: ye hosted payment links hain. Automatic QR ticket, inventory count ya cart abhi nahi hai.
  Payment ka confirmation Razorpay dashboard mein dekhna hoga.

FILES
- build.mjs: deploy par chalta hai, Firebase se published events/products padhta hai aur saari pages banata hai.
- data/events.json, products.json, settings.json: fallback/seed data (Firebase na mile tab bhi build chalta hai).
- public/: static files (admin.html, assets, Ganpati guide pages).
- _source/: Ganpati guide builder. Sirf tab chalao jab mandal data badle: python _source/spa_build.py

LISTING REQUESTS (public form)
- /list-your-event ab seedha Firebase mein request bhejta hai (email nahi). Poster upload bhi hota hai.
- Admin > Requests tab mein pending requests dikhti hain: Approve and publish / Reject. Phir Publish site dabao.
- Firestore rules mein firestore.rules.txt ka naya "match /submissions/{id}" block bhi add karke Publish karna zaroori hai.
- Admin ke event/product form mein bhi ab poster upload hai (link ki zaroorat nahi).
