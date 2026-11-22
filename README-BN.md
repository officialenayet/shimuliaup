# শিমুলিয়া ইউনিয়ন পরিষদ — সনদ ব্যবস্থাপনা

এই প্রকল্পটি GitHub Pages-এ চলা একটি static HTML/CSS/JavaScript অ্যাপ। অ্যাডমিন লগইন ও তথ্য সংরক্ষণের জন্য Supabase Auth এবং PostgreSQL ব্যবহার করে। GitHub Pages শুধু ওয়েব ফাইল প্রকাশ করে; ডেটাবেস বা ব্যাকএন্ড চালায় না। সে কারণে এই প্রকল্পের ডেটা Supabase-এ থাকবে।

অ্যাপে তিন ধরনের টেমপ্লেট আছে: নাগরিক সনদ—প্রত্যয়ন পত্রের ধরন, নাগরিক সনদ—স্থায়ী বাসিন্দার ধরন, এবং ওয়ারিশ সনদপত্র। অ্যাডমিন রেকর্ড খসড়া হিসেবে সংরক্ষণ করতে, সম্পাদনা করতে, প্রকাশ/অপ্রকাশ করতে এবং শেয়ার লিংক কপি করতে পারবেন। প্রকাশিত পেজে NID ডিফল্টভাবে দেখানো হয় না। অ্যাডমিনের স্পষ্ট অনুমতি-চেকবক্স চালু থাকলেই public RPC সেটি ফেরত দেয়।

## প্রকল্পের ফাইল

- `index.html`, `app.css`, `src/app.js` — অ্যাপের UI ও আচরণ।
- `config.js` — Supabase Project URL এবং public anon key বসানোর ফাইল।
- `supabase/schema.sql` — টেবিল, RLS নীতি, admin allow-list এবং public preview RPC।
- `.github/workflows/pages.yml` — `main` branch-এ push হলে GitHub Pages deploy করার workflow।
- `assets/logo.png` — পরিষদের লোগো।

## ১. Supabase প্রোজেক্ট তৈরি

1. পরিষদের নিয়ন্ত্রণে থাকা একটি Supabase account-এ নতুন project তৈরি করুন। Project database password নিরাপদে রাখুন।
2. Supabase Dashboard-এ **SQL Editor** খুলুন। এই repository-র `supabase/schema.sql` সম্পূর্ণ কপি করে নতুন query-তে চালান। এতে `certificates` ও `certificate_admins` table, row-level security (RLS) নীতি এবং `get_public_certificate()` function তৈরি হবে।
3. **Authentication → Providers** থেকে Email provider চালু আছে নিশ্চিত করুন। **Authentication → Settings / Signups**-এ public sign-up বন্ধ রাখুন। অ্যাডমিন অ্যাকাউন্ট শুধু পরিষদের অনুমোদিত লোকদের জন্য তৈরি করবেন।
4. **Authentication → Users** থেকে পরিষদের প্রথম অ্যাডমিন ব্যবহারকারী তৈরি বা invite করুন। ব্যবহারকারী তৈরির পর SQL Editor-এ নিচের query চালান। ইমেইলটি বাস্তব অ্যাডমিন ইমেইল দিয়ে বদলান:

   ```sql
   insert into public.certificate_admins (user_id)
   select id from auth.users
   where lower(email) = lower('admin@example.com')
   on conflict (user_id) do nothing;
   ```

5. একাধিক অ্যাডমিন হলে প্রত্যেক অনুমোদিত account-এর জন্য একই query চালান। `certificate_admins`-এ না থাকলে লগইন হলেও ড্যাশবোর্ডের রেকর্ড দেখা/পরিবর্তন করা যাবে না।

## ২. অ্যাপকে Supabase-এর সঙ্গে যুক্ত করা

Supabase Dashboard-এর **Project Settings → API** থেকে Project URL এবং **anon / publishable key** নিন। তারপর `config.js`-এ placeholder দুটো বদলান:

```js
window.APP_CONFIG = {
  supabaseUrl: "https://আপনার-project-id.supabase.co",
  supabaseAnonKey: "আপনার-public-anon-key"
};
```

এখানে শুধু public anon/publishable key ব্যবহার করবেন। এই key ওয়েবসাইটে দেখা যায়—এটি স্বাভাবিক; নিরাপত্তা RLS ও admin allow-list থেকে আসে। **`service_role` key, database password বা অন্য secret কখনো `config.js`, GitHub repository, HTML বা browser code-এ দেবেন না।** এই প্রকল্পে `service_role` key ব্যবহারই করা হয় না।

## ৩. GitHub Pages-এ প্রকাশ

1. GitHub-এ একটি repository তৈরি করে এই প্রকল্পের সব ফাইল upload/push করুন। `.github/workflows/pages.yml`-সহ hidden `.github` folder-টিও থাকতে হবে।
2. Repository-র **Settings → Pages → Build and deployment → Source**-এ **GitHub Actions** নির্বাচন করুন।
3. `main` branch-এ push করুন অথবা **Actions → Deploy static site to GitHub Pages → Run workflow** চালান। সবুজ deploy শেষে GitHub Pages URL খুলুন।
4. Supabase Dashboard-এর **Authentication → URL Configuration**-এ Site URL-এ আপনার GitHub Pages address দিন—যেমন `https://YOUR-ORG.github.io/YOUR-REPO/`। Redirect URLs-এ একই address যোগ করুন। আপনার নিজস্ব domain ব্যবহার করলে সেটিও যোগ করুন।
5. GitHub Pages URL খুলে অ্যাডমিন ইমেইল ও পাসওয়ার্ড দিয়ে প্রবেশ করুন।

এই সেটআপে GitHub repository-তে `config.js`-এর anon key প্রকাশিত থাকবে। এটি public key, কিন্তু অবশ্যই `service_role` key থেকে আলাদা। Repository-তে কখনো `service_role` key দেবেন না।

## ৪. স্থানীয়ভাবে চালানো

`file://` দিয়ে `index.html` খোলার বদলে local HTTP server চালান:

```bash
python3 -m http.server 8080
```

তারপর `http://localhost:8080/` খুলুন। লগইন ও ডেটা সংরক্ষণের জন্য আগে Supabase project, schema, admin allow-list এবং `config.js` ঠিকভাবে সেট করা লাগবে।

## ৫. সনদ তৈরি ও লিংক শেয়ার

1. অ্যাডমিন হিসেবে লগইন করে **নতুন সনদ** নির্বাচন করুন।
2. তিন ধরনের টেমপ্লেটের একটি বেছে সনদ নম্বর, নাম, পিতা-মাতা, ঠিকানা, ওয়ার্ড ও বক্তব্য লিখুন। ওয়ারিশ সনদে **ওয়ারিশ যোগ করুন** দিয়ে নাম, সম্পর্ক ও বয়স দিন।
3. NID না দিলে সেটি ফাঁকা রাখুন। প্রকাশ্য লিংকে NID না দেখাতে **NID দেখানোর অনুমতি আছে** চেকবক্সটি বন্ধ রাখুন—এটাই ডিফল্ট। চেকবক্স চালু করে প্রকাশ করলে সিস্টেম আবার নিশ্চিত হতে বলবে। প্রকাশিত NID লিংক জানা যে কেউ দেখতে পারবে; তাই প্রয়োজন ও বৈধ অনুমতি ছাড়া এটি প্রকাশ করবেন না।
4. **খসড়া সংরক্ষণ** করলে রেকর্ড private/admin-only থাকবে। **প্রকাশ করুন** চাপলে একটি অনন্য share code তৈরি হবে। তালিকার **লিংক কপি** দিয়ে URL পাঠাতে পারবেন।
5. **অপ্রকাশ** করলে পুরোনো share link-এ সনদ আর দেখা যাবে না। পরে আবার প্রকাশ করলে একই code পুনরায় কার্যকর হতে পারে। মুছে ফেললে রেকর্ড স্থায়ীভাবে মুছে যাবে।

## তথ্য ও নিরাপত্তা

- Public visitor সরাসরি `certificates` table পড়তে পারে না। প্রকাশিত রেকর্ডের জন্য শুধু `get_public_certificate()` RPC নির্দিষ্ট public fields ফেরত দেয়।
- NID field টেবিলে সংরক্ষিত থাকে, কিন্তু public RPC-এর মাধ্যমে কেবল `include_nid = true` হলে ফেরত যায়। Dashboard-এর login এবং database RLS ছাড়া record পরিবর্তন করা যায় না।
- শেয়ার লিংকটি অনন্য, অনুমান করা কঠিন code ব্যবহার করে। তবু public link যাকে দেবেন, সে সনদের প্রকাশ্য তথ্য দেখতে পারবে। সংবেদনশীল তথ্য প্রকাশের আগে অনুমতি ও পরিষদের নীতিমালা যাচাই করুন।
- নিরাপদ ব্যাকআপের জন্য Supabase database backup/export এবং repository-র private copy রাখুন। অ্যাডমিন কর্মী বদলালে তার Auth account নিষ্ক্রিয়/সরিয়ে `certificate_admins` allow-list-ও হালনাগাদ করুন। আগের সনদ রেকর্ড মুছে না গিয়ে সংরক্ষিত থাকবে।
- নতুন database বা hosting production-এ চালুর আগে পরিষদের test record দিয়ে পরীক্ষা করুন। বাস্তব নাগরিকের ব্যক্তিগত তথ্য test হিসেবে ব্যবহার করবেন না।

## সীমা

এই GitHub Pages সংস্করণে backend code GitHub-এ চলে না; Supabase সেটি দেয়। কোনো share link স্থায়ীভাবে কাজ করবে কেবল GitHub Pages সাইট ও Supabase project সক্রিয় থাকলে। GitHub Pages এবং Supabase আলাদা পরিষেবা—দুটোরই account ও configuration পরিষদের নিয়ন্ত্রণে রাখুন।
