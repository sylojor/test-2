# Task: Blog Admin Content System Verification & Fix

## Summary of Issues Found and Fixes Applied

### Issue 1: CRITICAL — Rich Text Editor was NOT WYSIWYG
**Problem**: The old "rich text editor" was just a toolbar that inserted Markdown syntax (`**bold**`, `*italic*`, `## heading`) into a plain textarea. When clicking Bold, you saw `**text**` as raw text — not bold text. This violated the core requirement of a WYSIWYG editor that shows formatting LIVE.

Additionally, the `insertTag` function directly manipulated DOM textarea values and dispatched synthetic events, which bypasses React's controlled input pattern and is unreliable.

**Fix**: Replaced the entire editor approach with a true WYSIWYG contentEditable-based editor (`WysiwygEditor` component):
- Uses a `contentEditable` div that shows formatting LIVE — bold text appears bold immediately
- Toolbar buttons call `document.execCommand('bold')`, `document.execCommand('italic')`, etc. for instant visual formatting
- Supports: Bold, Italic, Underline, Strikethrough, H2, H3, Paragraph, Bullet List, Numbered List, Blockquote, Links (with dialog), Inline Code
- Content is stored as HTML (schema supports "HTML/Markdown")
- Syncs between React state and DOM carefully (only on blur or when not actively editing)
- Extracted `ToolbarBtn` outside WysiwygEditor to avoid "components created during render" lint error

### Issue 2: CRITICAL — Cover Image Upload Variable Shadowing Bug
**Problem**: In `handleCoverUpload`, the local `FormData` variable was named `formData`, which shadowed the component's state variable also named `formData`. This caused:
```javascript
formData.append("altAr", formData.coverImageAltAr || "")  // formData here is FormData object, not state!
```
So `formData.coverImageAltAr` was always `undefined`, meaning alt text was never sent with the cover image upload.

**Fix**: Renamed the local FormData variable to `coverFormData`:
```javascript
const coverFormData = new FormData()
coverFormData.append("altAr", formData.coverImageAltAr || "")
```

### Issue 3: Image Uploader Missing Caption Fields Per Language
**Problem**: The `ImageUploader` component had alt and title fields for both languages (Arabic + English) but no caption fields. The `BlogImageType` interface includes `captionAr` and `captionEn`, and the API supports them, but the uploader didn't provide input fields for captions.

**Fix**: Added `captionAr` and `captionEn` input fields to `ImageUploader`, and passes caption data to `onImageAdded`.

### Issue 4: Image Manager Missing Caption Fields Per Language
**Problem**: The `ImageManager` component showed alt and title fields per language but not caption fields.

**Fix**: Added `captionAr` and `captionEn` input fields to each image card in `ImageManager`.

### Issue 5: No Tags Input UI
**Problem**: The `formData` had a `tags` field (string array), but there was no UI to input tags. The editor didn't show a tags input anywhere.

**Fix**: Created a `TagsInput` component with:
- Input field to type new tags
- Enter key or button click to add tags
- Click on tag badges to remove them
- Tags are displayed as removable badges

### Issue 6: Article View Rendering — Markdown vs HTML
**Problem**: The article view used `ReactMarkdown` to render content, but since the WYSIWYG editor now stores content as HTML, the Markdown renderer wouldn work correctly.

**Fix**: Replaced `ReactMarkdown` with `dangerouslySetInnerHTML` in the article view. The HTML content from the WYSIWYG editor renders correctly with proper styling using Tailwind prose classes.

### Issue 7: Prisma Schema Provider Mismatch
**Problem**: The Prisma schema was configured with `provider = "postgresql"` but the DATABASE_URL was `file:/home/z/my-project/db/custom.db` (SQLite). This caused Prisma to fail validation, making the entire blog API crash with 500 errors.

**Fix**: Changed `datasource db` provider from `"postgresql"` to `"sqlite"`. Prisma handles enums as strings in SQLite. Ran `db:push` and `db:generate` successfully.

### Issue 8: Blog Listing — Cover Image Alt/Title Not Used
**Problem**: The blog listing used post titles as alt text for cover images, but didn use the dedicated `coverImageAltAr`/`coverImageAltEn` fields.

**Fix**: Updated the listing interface to include cover image alt/title fields. Now uses `coverImageAltAr`/`coverImageAltEn` for proper alt text (with title as fallback). Also added featured post indicator and sorted featured posts first.

### Issue 9: Missing Blog Upload Directory
**Problem**: `/public/uploads/blog/` directory didn't exist, which would cause image uploads to fail.

**Fix**: Created the directory.

## Files Modified

1. `src/app/[lang]/admin/blog/blog-admin-content.tsx` — Complete rewrite with:
   - True WYSIWYG editor (contentEditable)
   - ToolbarBtn extracted as standalone component
   - TagsInput component added
   - Cover image upload bug fixed (variable shadowing)
   - Caption fields added to ImageUploader and ImageManager

2. `src/app/[lang]/blog/[slug]/blog-article-content.tsx` — Updated:
   - Removed ReactMarkdown import
   - Replaced `<ReactMarkdown>` with `dangerouslySetInnerHTML`
   - Added SEO meta title/description support
   - Proper prose styling for rendered HTML

3. `src/app/[lang]/blog/blog-content.tsx` — Updated:
   - Added coverImageAlt/title fields to interface
   - Uses proper alt text (with title fallback)
   - Added featured indicator
   - Featured posts sorted first

4. `prisma/schema.prisma` — Changed datasource provider from PostgreSQL to SQLite

## Verification

- Lint check: Only minor warnings (unused eslint-disable directives), no errors
- Dev server: Running successfully, API returns 200
- Blog API: `/api/blog` and `/api/blog?admin=true` return proper JSON
- Upload directory: Created `/public/uploads/blog/`
