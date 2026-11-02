NOTE: Ab poori guide docs/OPERATIONS.md mein hai (daily kaam, recovery, security checklist). Rules ke liye firestore.rules.txt ka POORA text paste karo.

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

QUICK ADD (admin > Quick add)
- Kahin se copy kiya hua event ka paragraph paste karo (poster image optional). "Analyse and fill the form" dabao.
- Title, city, category, venue, area, date, time, price/passes, ticket link, organiser, description apne aap bhar jate hain.
- Form ke upar "Please verify" notes aate hain. Check/edit karke Save, phir Publish site.
- Kai events ek saath: beech mein --- wali line rakho. Ek save/skip ke baad agla form khulta hai.
- Phone number public page par automatically nahi daalta.

ORGANISER PORTAL (/my-events)
- Organiser Google se sign in karta hai, apne events list/edit/take down/delete kar sakta hai. Sirf apna data dikhta hai (Firestore rules se enforce).
- Edit karne par listing dubara "pending" ho jati hai; admin Requests tab mein "Approve changes" dabata hai, tab live event update hota hai (purana version tab tak live rehta hai).
- Take down: event ko published=false kar deta hai (site update ke baad hat jata hai). Admin ko "Taken down by owner" mein dikhta hai.
- Admin > Requests mein Pending / Approved / Rejected / Taken down / All history hai, reject karte time reason likh sakte ho.
- Firebase > Authentication > Settings > Authorized domains mein puneganpatilive.in, www.puneganpatilive.in aur ganpatilive.vercel.app hona chahiye.
- Firestore rules: poora naya firestore.rules.txt Rules mein paste karke Publish karo.

SHARE
- Har page par "Share" button (phone par native share, computer par WhatsApp/Telegram/Facebook/X/Email/Copy link), har event card par share icon.

9STORE (online shop, prepaid UPI) : NAYA
=========================================
Shop ka naam ab 9Store hai (/9store). Purane /shop links apne aap /9store par jate hain.

EK BAAR SETUP (sirf ye 3 kaam)
1. Firestore rules: firestore.rules.txt ka POORA text Firebase Console > Firestore > Rules mein paste karke Publish karo.
   (Isme naye "orders" aur "productPrivate" rules hain. Ye na karo to customer order save nahi hoga.)
2. /admin kholo > "9Store settings" tab: apna UPI ID daalo (e.g. name@okhdfcbank), delivery charge (default Rs 80), Save.
   Neeche "Test your UPI QR" se QR scan karke dekho ki sahi account khul raha hai.
3. Vercel par ye deploy hone ke baad /api/meesho chalega (admin ke product import ke liye). Kuch aur set karne ki zaroorat nahi.
   Agar domain puneganpatilive.in se alag ho to Vercel > Settings > Environment Variables mein SITE_URL daalo.

PRODUCT KAISE DAALNA HAI
- /admin > "9Store products" > + New product.
- Meesho product ka link paste karo > Fetch. Naam, photos, sizes aur Meesho price (aapka cost) bhar jata hai.
  Link na chale (Meesho kabhi kabhi bot ko rok deta hai) to form haath se bhar do: photos upload kar sakte ho.
- "Profit": flat Rs ya percent daalo, selling price apne aap ban jata hai (ya khud likh do). Aapka cost aur profit PRIVATE hai, public site par kabhi nahi jata.
- Save > upar "Publish site" dabao. ~1 minute mein site par dikhega.

CUSTOMER KA FLOW
Product > Add to cart > Checkout (naam, mobile, poora address, PIN, state) > UPI QR (exact amount) > customer UPI reference (UTR) daalta hai > order page par status dekhta hai.
Delivery Rs 80 har order par ek baar judti hai (har item par nahi).

ROZ KA KAAM: ORDERS
- /admin > Orders > "Verify payment": apne bank/UPI app mein amount aur UPI reference match karo > "Payment received".
- "Copy address" dabao, wahi item Meesho par customer ke address par order karo.
- Courier mil jaye to "Mark shipped" (tracking daalo), phir "Mark delivered". Customer ko har badlav turant dikhta hai. Orders ke liye Publish site nahi chahiye.
- Agar amount items se match nahi karta to laal warning dikhti hai: us order ko confirm mat karo.

DHYAN RAKHNE WALI BAATEN
- Payment ka confirmation haath se hota hai (UPI mein bina payment gateway ke auto-confirm nahi hota). Auto-confirm chahiye to Razorpay jodna padega.
- Order ka link (20 akshar ka random id) jiske paas hai wo wo order dekh sakta hai. Isliye customer ko link kisi ko dene ko mat bolo.
- Photos Firestore mein chhoti karke save hoti hain (max 5 per product).
