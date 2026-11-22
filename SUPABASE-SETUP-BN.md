# Supabase account ও project setup — ধাপে ধাপে

এই নির্দেশিকাটি শিমুলিয়া ইউনিয়ন পরিষদের সনদ ব্যবস্থাপনা অ্যাপের জন্য। কাজগুলো পরিষদের নিয়ন্ত্রণে থাকা account ও GitHub repository-তে করুন। GitHub Pages শুধু HTML/CSS/JavaScript দেখায়; login ও ডেটাবেস Supabase-এ থাকবে।

## আগে যা লাগবে

- একটি পরিষদ-নিয়ন্ত্রিত ইমেইল ঠিকানা, যেটির password ও recovery পদ্ধতি পরিষদের কাছে থাকবে।
- এই প্রকল্পের ZIP অথবা GitHub repository-র code। ZIP খুললে `supabase/schema.sql` এবং `config.js` ফাইল পাবেন।
- GitHub account, যদি এখনো Pages deploy না করে থাকেন।

**নিরাপত্তার মূল কথা:** `config.js`-এ শুধু Supabase Project URL ও public `publishable` key (অথবা পুরোনো `anon` key) বসবে। `secret`/`service_role` key বা database password কোনোদিন `config.js`, GitHub, HTML বা browser-এ দেবেন না। Public key browser-এ দেখা যায়; এই অ্যাপে ডেটা সুরক্ষিত রাখে RLS এবং অনুমোদিত admin allow-list। [1] [2]

## ১. Supabase account খুলুন

1. [Supabase Dashboard](https://supabase.com/dashboard)-এ যান। **Sign up** নির্বাচন করে পরিষদের ইমেইল দিয়ে account তৈরি করুন। চাইলে GitHub দিয়ে sign up করতে পারেন, তবে account ও recovery যেন পরিষদের নিয়ন্ত্রণে থাকে।
2. ইমেইলে পাঠানো verification link খুলে account নিশ্চিত করুন, তারপর Dashboard-এ sign in করুন।
3. প্রথমবার organization তৈরি করতে বললে পরিষদের নামে তৈরি করুন। Organization owner হিসেবে এমন account ব্যবহার করুন যেটি ভবিষ্যতেও পরিষদের কাছে থাকবে।

Supabase-এর Free Plan-এ বর্তমানে সীমিত সংখ্যক project ও usage quota আছে; project চালু করার আগে [বর্তমান plan ও quota](https://supabase.com/docs/guides/platform/billing-on-supabase) দেখে নিন। [3]

## ২. Supabase project তৈরি করুন

1. Dashboard-এ **New project** চাপুন এবং পরিষদের organization নির্বাচন করুন।
2. Project name দিন, যেমন `shimulia-certificate-system`।
3. Database password তৈরি করুন। শক্তিশালী password ব্যবহার করে password manager বা পরিষদের নিরাপদ নথিতে রাখুন। এটি Supabase login password নয় এবং এই অ্যাপের `config.js`-এ লাগবে না।
4. Region হিসেবে বাংলাদেশের কাছাকাছি যে region তালিকায় পাওয়া যায় সেটি বেছে নিন। Plan/compute নির্বাচন দেখালে খরচ ও quota দেখে সিদ্ধান্ত নিন। কোনো paid plan বা add-on অনুমোদন ছাড়া চালু করবেন না।
5. **Create new project** চাপুন। Database প্রস্তুত হওয়া পর্যন্ত অপেক্ষা করুন। Project dashboard খুললে বাম পাশের menu দেখা যাবে।

Supabase-এর project setup flow Dashboard থেকে নতুন project তৈরি করেই শুরু হয়। [4]

## ৩. Database schema চালান

এই ধাপে অ্যাপের tables, নিরাপত্তা নীতি এবং public share-link function তৈরি হবে।

1. ZIP ডাউনলোড করে unzip করুন, অথবা GitHub repository-তে `supabase/schema.sql` ফাইল খুলুন।
2. ফাইলের সম্পূর্ণ SQL কপি করুন। শুধু কিছু অংশ নয়—প্রথম comment থেকে শেষ পর্যন্ত কপি করুন।
3. Supabase Dashboard-এ সঠিক project নির্বাচন করে **SQL Editor** খুলুন। **New query** চাপুন।
4. SQL paste করে **Run** চাপুন। Query সফল হলে `certificates`, `certificate_admins`, RLS policies এবং `get_public_certificate()` তৈরি হবে। SQL Editor-এ query চালানো Supabase-এর সমর্থিত database setup পদ্ধতি। [4] [5]

`schema.sql`-এ `certificate_admins` allow-list আছে। এই তালিকায় যোগ না করা account-কে শুধু sign-in করতে পারলেও সনদের dashboard-এ প্রবেশাধিকার দেওয়া হবে না। Public visitor সরাসরি `certificates` table পড়ে না; share link-এর জন্য নির্দিষ্ট RPC function প্রকাশিত রেকর্ডের সীমিত তথ্য দেয়। [6]

## ৪. Email login চালু রাখুন, public sign-up বন্ধ করুন

1. Dashboard-এ **Authentication → Sign In / Providers** বা **Authentication → Providers** খুলুন। **Email** provider enabled আছে নিশ্চিত করুন।
2. **Authentication → Settings** বা Auth-এর general settings-এ **Allow new users to sign up** toggle বন্ধ করুন। এতে শুধু আগে তৈরি করা user-রা sign in করতে পারবে। Dashboard থেকে admin user তৈরি করার সুবিধা আলাদা থাকবে। [7]
3. Email provider-এর **Confirm email** setting চালু থাকলে admin-এর email যাচাই সম্পন্ন করুন; invitation পেলে ইমেইলের link-ও খুলুন।

Dashboard-এর label বা অবস্থান সামান্য বদলাতে পারে। Supabase-এর Auth general configuration-এ public signup বন্ধ করলে নতুন user-এর sign-up বন্ধ হয়, কিন্তু existing user sign in করতে পারে। [7]

## ৫. প্রথম admin user তৈরি করুন

1. **Authentication → Users** খুলুন।
2. **Add user** চাপুন। Dashboard-এ যে বিকল্পটি দেখায়, তার মধ্যে **Create new user** দিয়ে email ও একটি অস্থায়ী/শক্তিশালী password দিন; অথবা **Send invitation** বেছে admin-এর email-এ invite পাঠান। Invite হলে প্রাপককে email link খুলে account setup শেষ করতে হবে। Dashboard থেকে user invite করা Supabase-এর সমর্থিত admin কাজ। [8]
3. User তৈরি হওয়ার পর Auth Users তালিকায় admin-এর সঠিক email দেখা যাচ্ছে নিশ্চিত করুন।
4. এবার **SQL Editor → New query**-তে নিচের SQL চালান। `admin@example.com`-এর জায়গায় Auth Users-এ থাকা হুবহু email লিখুন:

```sql
insert into public.certificate_admins (user_id)
select id
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (user_id) do nothing;
```

5. একাধিক অনুমোদিত admin লাগলে প্রত্যেকের জন্য একই query চালান, শুধু email বদলান। Admin-কে তালিকা থেকে সরালে তার dashboard access বন্ধ হবে।

**গুরুত্বপূর্ণ:** admin-এর email ভুল লিখলে login সফল হলেও dashboard access নাও মিলতে পারে। Email ও `certificate_admins`-এ user যুক্ত হয়েছে কি না পরে আবার মিলিয়ে নিন।

## ৬. Project URL ও public key `config.js`-এ বসান

1. Supabase project-এ **Connect** panel খুলুন; অথবা project-এর **Settings → API Keys**-এ যান। Dashboard-এর বর্তমান interface-এ API key-এর অবস্থান/নাম বদলাতে পারে।
2. Project URL কপি করুন। URL সাধারণত `https://....supabase.co` আকারের।
3. **Publishable key** কপি করুন—সাধারণত `sb_publishable_...` দিয়ে শুরু। যদি Dashboard-এ পুরোনো `anon` key-ই দেখায়, সেটিও browser-এর জন্য public key এবং এই app-এর `supabaseAnonKey` field-এ বসানো যায়। Supabase নতুন project-এ `publishable`/`secret` key format চালু করেছে; `anon`/`service_role` পুরোনো format-ও কিছু project-এ থাকবে। [1]
4. প্রকল্পের `config.js` খুলে placeholder বদলে নিচের মতো করুন:

```js
window.APP_CONFIG = {
  supabaseUrl: "https://আপনার-project-id.supabase.co",
  supabaseAnonKey: "sb_publishable_আপনার-public-key"
};
```

`supabaseAnonKey` নামটি code-এ আগের নাম হিসেবে আছে; এখানে public publishable key বসানো যায়। উদ্ধৃতি চিহ্ন ও comma ঠিক রাখুন।

**কখনো বসাবেন না:** `sb_secret_...`, `service_role`, database password, বা অন্য কোনো secret। Secret key RLS bypass করতে পারে এবং server-এর বাইরে প্রকাশ করা যাবে না। [1] [2]

5. পরিবর্তন save করে GitHub repository-র `main` branch-এ commit/push করুন। Public key source code-এ থাকাটা এই architecture-এ স্বাভাবিক; secret key প্রকাশ করাটা বিপজ্জনক।

## ৭. GitHub Pages deploy করুন

যদি আগেই GitHub-এ এই project-এর code থাকে, এই ধাপের repository অংশটি বাদ দিন।

1. GitHub-এ নতুন repository তৈরি করুন। Repository-তে সব project file রাখুন, বিশেষ করে `.github/workflows/pages.yml` এবং `supabase/schema.sql`। Hidden `.github` folder বাদ পড়েছে কি না নিশ্চিত করুন।
2. `config.js`-এ Supabase URL ও public key বসানোর পর পরিবর্তনসহ সব file repository-তে push করুন।
3. GitHub repository-তে **Settings → Pages → Build and deployment → Source** থেকে **GitHub Actions** নির্বাচন করুন।
4. `main` branch-এ push করলে `Deploy static site to GitHub Pages` workflow চলবে। GitHub-এর **Actions** tab খুলে workflow সফল হওয়া পর্যন্ত অপেক্ষা করুন।
5. Deploy সফল হলে GitHub যে Pages URL দেখায় সেটি কপি করে রাখুন। Project repository হলে URL সাধারণত `https://YOUR-ORG.github.io/YOUR-REPO/`-এর মতো। এটি আপনার নিজের URL দিয়ে বদলাবেন।

## ৮. Supabase Auth-এ GitHub Pages URL অনুমোদন করুন

1. Supabase Dashboard-এ **Authentication → URL Configuration** খুলুন।
2. **Site URL**-এ GitHub Pages-এর সম্পূর্ণ production URL বসান—শেষের `/`-সহ, যেমন `https://YOUR-ORG.github.io/YOUR-REPO/`।
3. **Redirect URLs** তালিকায়ও একই exact URL যোগ করুন। নিজস্ব domain থাকলে সেটিও যোগ করুন। অপ্রয়োজনীয় wildcard যোগ করবেন না।
4. Save করুন। Supabase-এ Site URL হলো default redirect address; email confirmation/reset link ঠিকমতো ফেরত আসার জন্য production URL সেট করা জরুরি। [9]

## ৯. প্রথমবার পরীক্ষা করুন

1. GitHub Pages URL খুলুন। Admin-এর email ও password দিয়ে sign in করুন। Admin allow-list-এ email-টি যোগ করার আগে login না হলে আগে ধাপ ৫ মিলিয়ে নিন।
2. কোনো বাস্তব নাগরিকের তথ্য নয়—একটি কাল্পনিক test record দিয়ে draft সংরক্ষণ, সম্পাদনা, publish এবং unpublish পরীক্ষা করুন।
3. Publish করলে app-এর **লিংক কপি** দিয়ে share URL নিন। Private/incognito window-তে URL খুলে প্রকাশিত preview দেখা যায় কি না পরীক্ষা করুন।
4. NID-এর checkbox বন্ধ থাকলে NID preview-তে না আসা নিশ্চিত করুন। প্রকৃত NID বা ব্যক্তিগত তথ্য test হিসেবে ব্যবহার করবেন না। NID প্রকাশের জন্য আলাদা স্পষ্ট অনুমতি লাগে; share link যার কাছে থাকবে, সে প্রকাশিত তথ্য দেখতে পারবে।
5. কাজ শেষে test record মুছে ফেলুন অথবা unpublish করুন।

## সমস্যা হলে

- **Invalid API key / project not found:** URL ও key একই Supabase project থেকে কপি হয়েছে কি না দেখুন; `config.js` save/push এবং Pages workflow সফল হয়েছে কি না দেখুন।
- **Login হয়, কিন্তু record দেখা/যোগ করা যায় না:** Auth Users-এ email ঠিক আছে কি না এবং `certificate_admins` insert query-তে সঠিক email ব্যবহার হয়েছে কি না দেখুন। তারপর sign out করে আবার sign in করুন।
- **Share link-এ record নেই:** Record status `published` কি না এবং share code ঠিক আছে কি না দেখুন। Draft ও unpublished record public দেখা যাবে না।
- **Email link ভুল page-এ যায়:** Auth → URL Configuration-এ Site URL এবং Redirect URLs-এ Pages URL, repository path ও trailing slash ঠিক আছে কি না যাচাই করুন।
- **Schema query error:** SQL Editor সঠিক project-এ খোলা কি না এবং `schema.sql` সম্পূর্ণ কপি হয়েছে কি না দেখুন। Error text বুঝতে না পারলে কাউকে পাঠানোর আগে project URL/key, password ও ব্যক্তিগত তথ্য মুছে দিন।

## অফিসিয়াল Supabase সূত্র

[1]: https://supabase.com/docs/guides/getting-started/api-keys "Supabase API keys"
[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Row Level Security"
[3]: https://supabase.com/docs/guides/platform/billing-on-supabase "Supabase plans and quotas"
[4]: https://supabase.com/docs/guides/getting-started/quickstarts/reactjs "Supabase project and SQL Editor quickstart"
[5]: https://supabase.com/docs/guides/database/tables "Supabase tables and SQL"
[6]: https://supabase.com/docs/guides/api/securing-your-api "Supabase API security"
[7]: https://supabase.com/docs/guides/auth/general-configuration "Supabase Auth general configuration"
[8]: https://supabase.com/docs/guides/auth/users "Supabase Auth users and invitations"
[9]: https://supabase.com/docs/guides/auth/redirect-urls "Supabase Auth redirect URLs"
