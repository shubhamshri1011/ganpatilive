# Pune Ganpati LIVE: Operations guide (Hinglish)

## 1. Roz ka kaam (5 minute)
1. `www.puneganpatilive.in/admin` kholo, owner Google account (shubhamshri.1110@gmail.com) se login.
2. **Requests** tab: naye listing requests dekho. Phone number sirf yahan dikhta hai. Theek ho to *Approve and publish*, galat/spam ho to *Reject* (reason likho).
3. Kuch bhi save/approve/hide/delete kiya? Upar **Publish site** dabao. 1-2 minute mein live.
4. **Moderation** tab: Ganpati pages ke public comments / crowd reports mein spam ho to Delete (turant, publish nahi chahiye).
5. Naya event khud daalna ho: **Quick add** (text paste karo) ya **Events > New event**.

## 2. Site kaise update hoti hai
- Site static hai. Har deploy par `build.mjs` Firestore se published events padh ke pages banata hai.
- **Safety:** agar Firestore na mile ya 0 events aayein, build *fail* ho jata hai aur Vercel purani working site live rakhta hai. Vercel > Deployments mein "Error" dikhega; thodi der baad Publish dobara dabao.
- Roz raat 00:10 IST ko GitHub Action (`daily-rebuild`) site rebuild karta hai taaki ended events hat jayein. Iske liye GitHub secret `VERCEL_DEPLOY_HOOK_URL` banao (Settings > Secrets and variables > Actions).
- Ended events 60 din tak noindex page ke saath rehte hain, phir build se hat jate hain.

## 3. Kuch toot jaye to (recovery)
| Problem | Kya karo |
|---|---|
| Site pe galat change gaya | Vercel > Deployments > pichla green deployment > **Promote to Production** (Instant Rollback) |
| Build fail (Firestore error) | Firebase status dekho, 10 min baad Publish. Rules ya project delete to nahi hua, check karo |
| Admin "not allowed" | Galat Google account. Sign out karke owner account use karo |
| Sign-in popup band/blocked | Browser popup allow karo; ya Chrome mein kholo |
| Deploy hook leak ho gaya | Vercel > Settings > Git > Deploy Hooks > purana delete, naya banao, admin Settings mein naya daalo |
| Galat rules publish ho gaye | Firebase Console > Firestore > Rules > History se purana version restore |

Local build test (PowerShell, project folder mein):
```
node build.mjs          # offline: local seed data se chalta hai
npm test                # parser tests
```

## 4. Security checklist (ek baar, phir har 3 mahine)
- [ ] `firestore.rules.txt` ka poora text Firebase Console > Firestore > Rules mein paste + Publish.
- [ ] Firebase Console > Authentication > Settings > Authorized domains: `puneganpatilive.in`, `www.puneganpatilive.in` (aur chaho to `ganpatilive.vercel.app`). `localhost` hata do agar hai.
- [ ] Google Cloud Console > APIs & Services > Credentials > Browser key (Firebase web key) > Application restrictions = **Websites**; add: `https://www.puneganpatilive.in/*`, `https://puneganpatilive.in/*`, `https://puneganpatilive.firebaseapp.com/*`, (`https://ganpatilive.vercel.app/*`). API restrictions: Identity Toolkit API, Token Service API, Cloud Firestore API.
- [ ] Vercel > Domains: `puneganpatilive.in` ko `www.puneganpatilive.in` par redirect (308). (vercel.json mein bhi hai.)
- [ ] Firestore > Data > `crowdReports` aur `comments` ek baar dekho; koi `<script`/`<img` wali purani entry ho to delete (ya Admin > Moderation).
- [ ] Admin > Settings > **Privacy cleanup** ek baar dabao (purane events se organiser e-mail hatata hai).
- [ ] Firebase Console > Usage: Spark limits (reads 50k/din, writes 20k/din) dekho; spam aaye to App Check chalu karo (reCAPTCHA v3 key banao, mujhe site key do, main code jod dunga).
- [ ] Deploy hook sirf apne browser mein save hota hai. Public/shared computer par admin mat kholo.
- [ ] Kabhi service-account key, token, hook URL chat/repo mein paste mat karo. GitHub/Vercel secrets use karo.

## 5. Ganpati guide (23 pages) badalna ho
Ye pages `_source/` se bante hain. Naye CSS classes aaye to Tailwind CSS dobara banao:
```
npx tailwindcss@3.4.17 -c tools/tailwind.config.cjs -i tools/tailwind-in.css -o public/assets/vendor/ganpati.css --minify
```
