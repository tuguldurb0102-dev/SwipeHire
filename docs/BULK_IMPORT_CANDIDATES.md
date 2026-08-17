# 500 нэр дэвшигчийг бөөнөөр оруулах (Bulk import)

Компанийн 500+ гадаад ажилтны CV-г SwipeHire-д **profile-only** (нэвтрэхгүй,
зөвхөн ажил олгогчдод харагдах) байдлаар нэг admin эрхээр оруулна.

## Хэрхэн ажилладаг

Скрипт CSV-г уншаад мөр бүрд:
1. Auth хэрэглэгч үүсгэнэ (санамсаргүй нууц үг — хэзээ ч хэвлэгдэхгүй, тараагдахгүй).
2. DB trigger нь `profiles` мөрийг автоматаар үүсгэнэ (role=candidate).
3. `candidate_profiles`-ийг `published=true`-ээр бичнэ → ажил олгогчийн feed-д шууд харагдана.

> Нэвтрэх шаардлагагүй. Нууц үгийг нь тараахгүй тул хэн ч тэр аккаунтаар
> ороохгүй. Хэрэв хожим нэр дэвшигч өөрийн профайлаа авах бол имэйлээрээ
> "нууц үг сэргээх" хийж болно.

## Алхам 1 — CSV бэлдэх

`scripts/candidates.template.csv`-г жишээ болгон ашигла. Excel дээр өгөгдлөө
энэ баганы дарааллаар оруулаад **CSV UTF-8** болгож `scripts/candidates.csv`
нэрээр хадгал.

| Багана | Заавал | Тайлбар |
|---|---|---|
| `full_name` | ✅ | Овог нэр |
| `age` | | Нас (18–100). Хоосон бол алгасна |
| `gender` | | `male` / `female` / `other` |
| `category` | | Мэргэжил (ж: Гагнуурчин) |
| `location` | | Байршил |
| `phone` | | Утас |
| `email` | | Имэйл (байхгүй бол автоматаар үүснэ) |
| `about` | | Товч танилцуулга |
| `skills` | | Ур чадвар, **цэг таслал `;`-ээр** тусгаарла (ж: `MIG;TIG`) |
| `salary_expectation` | | Хүлээж буй цалин (тоо) |
| `available_from` | | Хэзээнээс ажиллах |

⚠️ `scripts/candidates.csv` нь бодит хүмүүсийн мэдээлэл тул git-д commit
хийхгүй (`.gitignore`-д нэмсэн).

## Алхам 2 — Service role key авах

Supabase dashboard → **Project Settings → API** → `service_role` `secret` key.
Энэ түлхүүр RLS-ийг тойрдог тул **нууц**, хэзээ ч commit хийж болохгүй.

## Алхам 3 — Скрипт ажиллуулах (PowerShell, project root дотор)

```bash
$env:SUPABASE_URL="https://eltwjnnoiblmpsvensas.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role secret key>"
node scripts/import-candidates.mjs scripts/candidates.csv
```

Гараас: `✓ Done. created=… skipped=… errors=…`
Алдаа гарвал `scripts/import-results.json`-оос дэлгэрэнгүйг хар.
Дахин ажиллуулах аюулгүй — байгаа имэйлүүдийг алгасна.

## Алхам 4 — Өөрийн аккаунтаа admin болгох (нэг удаа)

Supabase dashboard → **SQL Editor** дээр (өөрийн бүртгэлтэй имэйлээ тавь):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'ТАНЫ@имэйл');
```

Ингэснээр чи бүх нэр дэвшигчийг харах/удирдах admin эрхтэй болно.

## Шалгах

Ажил олгогчоор нэвтрээд candidate feed / employer вебийн "Candidates" хэсэгт
оруулсан 500 профайл харагдана.
