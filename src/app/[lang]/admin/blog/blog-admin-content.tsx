"use client"

// ============================================
// Blog Admin Content — Full CRUD Interface
// True WYSIWYG rich editor, bilingual, images with alt/title/caption
// Enhanced: selection preservation, alignment, inline image insertion,
// bilingual image data attributes, localized notifications
// ============================================

import { useState, useEffect, useCallback, useRef, use } from "react"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import {
  Plus, Edit3, Trash2, Eye, Globe, Image as ImageIcon, Upload,
  Save, ArrowLeft, Bold, Italic, List, Link2, Heading1, Heading2,
  Code, Quote, ChevronDown, Search, Loader2, X, FileText,
  Check, Star, BookOpen, ListOrdered, Underline, Strikethrough,
  Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Unlink2, ImagePlus
} from "lucide-react"

// ============================================
// Types
// ============================================

interface BlogImageType {
  id: string
  url: string
  altAr?: string | null
  altEn?: string | null
  titleAr?: string | null
  titleEn?: string | null
  captionAr?: string | null
  captionEn?: string | null
  position: number
}

interface BlogPostType {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  contentAr: string
  contentEn: string
  excerptAr?: string | null
  excerptEn?: string | null
  coverImage?: string | null
  coverImageAltAr?: string | null
  coverImageAltEn?: string | null
  coverImageTitleAr?: string | null
  coverImageTitleEn?: string | null
  category?: string | null
  tags?: string | null
  metaTitleAr?: string | null
  metaTitleEn?: string | null
  metaDescAr?: string | null
  metaDescEn?: string | null
  status: string
  featured: boolean
  views: number
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
  author?: { id: string; name: string } | null
  images: BlogImageType[]
}

// ============================================
// Toolbar Button
// ============================================

function ToolbarBtn({ onClick, title, children, active }: {
  onClick: (e?: React.MouseEvent) => void
  title: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(e) }}
      title={title}
      className={`p-2 rounded-md transition-colors ${
        active
          ? "bg-brand/20 text-brand"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

// ============================================
// True WYSIWYG Rich Text Editor Component
// Uses MAGIC_CONTENTEDITABLE_MARKER with selection preservation
// Features: alignment, image insertion, inline links,
// bilingual image data, inline code, unlink
// ============================================

function WysiwygEditor({
  value,
  onChange,
  placeholder,
  language,
}: {
  value: string
  onChange: (html: string) => void
  placeholder: string
  language: Locale
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)

  // Image insertion dialog state
  const [imgSrc, setImgSrc] = useState("")
  const [imgAltAr, setImgAltAr] = useState("")
  const [imgAltEn, setImgAltEn] = useState("")
  const [imgTitleAr, setImgTitleAr] = useState("")
  const [imgTitleEn, setImgTitleEn] = useState("")
  const [imgCaptionAr, setImgCaptionAr] = useState("")
  const [imgCaptionEn, setImgCaptionEn] = useState("")
  const [imgUploading, setImgUploading] = useState(false)
  const [imgWidth, setImgWidth] = useState(0)
  const [imgHeight, setImgHeight] = useState(0)

  // === SELECTION PRESERVATION ===
  const savedRangeRef = useRef<Range | null>(null)
  // Flag to prevent blur from overwriting DOM while toolbar action is in progress
  const toolbarActionRef = useRef(false)

  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      // Only save if range is within the editor
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
  }

  const restoreSelection = () => {
    const sel = window.getSelection()
    if (!sel || !savedRangeRef.current) return false
    try {
      // Validate the range is still meaningful
      const startNode = savedRangeRef.current.startContainer
      const endNode = savedRangeRef.current.endContainer
      if (!startNode || !endNode) return false
      // Check nodes are still in the DOM
      if (!document.contains(startNode) || !document.contains(endNode)) return false
      sel.removeAllRanges()
      sel.addRange(savedRangeRef.current)
      return true
    } catch {
      return false
    }
  }

  // Sync content from React state to DOM when value changes externally
  // Skip sync if a toolbar action just happened (to avoid invalidating selection)
  useEffect(() => {
    if (editorRef.current && !isFocused && !toolbarActionRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value
      }
    }
  }, [value, isFocused])

  // Handle input events — sync DOM content back to React state
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      onChange(html)
    }
  }, [onChange])

  // Save selection on mouseup inside the editor (most reliable)
  const handleEditorMouseUp = useCallback(() => {
    saveSelection()
  }, [])

  // Also save on selection change as backup
  const handleSelectionChange = useCallback(() => {
    if (isFocused) {
      saveSelection()
    }
  }, [isFocused])

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [handleSelectionChange])

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => {
    // Don't sync or mark unfocused if a toolbar action is in progress
    if (toolbarActionRef.current) return
    setIsFocused(false)
    // Final sync on blur
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  // Toolbar command — uses execCommand for instant WYSIWYG formatting
  const execCmd = (command: string, value?: string) => {
    toolbarActionRef.current = true
    const restored = restoreSelection()
    editorRef.current?.focus()
    if (restored || command === "undo" || command === "redo") {
      document.execCommand(command, false, value)
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
    // Re-save selection after command
    setTimeout(() => {
      saveSelection()
      toolbarActionRef.current = false
    }, 0)
  }

  // === INSERT LINK ===
  const openLinkDialog = () => {
    toolbarActionRef.current = true
    saveSelection()
    setLinkUrl("")
    setShowLinkDialog(true)
  }

  const insertLink = () => {
    if (!linkUrl) return
    toolbarActionRef.current = true
    restoreSelection()
    editorRef.current?.focus()
    document.execCommand("createLink", false, linkUrl)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
    setShowLinkDialog(false)
    setLinkUrl("")
    setTimeout(() => { toolbarActionRef.current = false }, 0)
  }

  // === UNLINK ===
  const unlink = () => {
    toolbarActionRef.current = true
    restoreSelection()
    editorRef.current?.focus()
    document.execCommand("unlink", false)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
    setTimeout(() => { toolbarActionRef.current = false }, 0)
  }

  // === INLINE CODE ===
  const insertInlineCode = () => {
    toolbarActionRef.current = true
    restoreSelection()
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const selectedText = range.toString()
      if (selectedText) {
        const codeEl = document.createElement("code")
        codeEl.className = "inline-code"
        codeEl.textContent = selectedText
        range.deleteContents()
        range.insertNode(codeEl)
        sel.removeAllRanges()
        const newRange = document.createRange()
        newRange.setStartAfter(codeEl)
        newRange.collapse(true)
        sel.addRange(newRange)
      }
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
    setTimeout(() => { toolbarActionRef.current = false }, 0)
  }

  // === INSERT IMAGE IN EDITOR ===
  const openImageDialog = () => {
    toolbarActionRef.current = true
    saveSelection()
    setImgSrc("")
    setImgAltAr("")
    setImgAltEn("")
    setImgTitleAr("")
    setImgTitleEn("")
    setImgCaptionAr("")
    setImgCaptionEn("")
    setImgWidth(0)
    setImgHeight(0)
    setShowImageDialog(true)
  }

  // Handle file upload for inline image
  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgUploading(true)
    try {
      const uploadForm = new FormData()
      uploadForm.append("file", file)
      const res = await fetch("/api/blog/upload", { method: "POST", body: uploadForm })
      if (res.ok) {
        const data = await res.json()
        setImgSrc(data.url)
        // Store dimensions for proper img tag attributes
        if (data.width && data.height) {
          setImgWidth(data.width)
          setImgHeight(data.height)
        }
        toast.success(language === "ar" ? "تم رفع الصورة" : "Image uploaded")
      } else {
        const err = await res.json()
        toast.error(err.error || (language === "ar" ? "فشل رفع الصورة" : "Upload failed"))
      }
    } catch {
      toast.error(language === "ar" ? "فشل رفع الصورة" : "Upload failed")
    } finally {
      setImgUploading(false)
    }
  }

  const insertImage = () => {
    if (!imgSrc) {
      toast.error(language === "ar" ? "يجب رفع صورة أو إدخال رابط" : "Must upload image or enter URL")
      toolbarActionRef.current = false
      return
    }

    // Determine which alt/title/caption to show based on current editor language
    const currentAlt = language === "ar" ? imgAltAr : imgAltEn
    const currentTitle = language === "ar" ? imgTitleAr : imgTitleEn
    const currentCaption = language === "ar" ? imgCaptionAr : imgCaptionEn

    // Build figure HTML with bilingual data attributes + width/height for SEO
    const widthAttr = imgWidth > 0 ? ` width="${imgWidth}"` : ""
    const heightAttr = imgHeight > 0 ? ` height="${imgHeight}"` : ""
    const loadingAttr = "loading=\"lazy\""
    const figureHtml = `<figure class="article-image" data-alt-ar="${imgAltAr}" data-alt-en="${imgAltEn}" data-title-ar="${imgTitleAr}" data-title-en="${imgTitleEn}" data-caption-ar="${imgCaptionAr}" data-caption-en="${imgCaptionEn}" style="margin:1em 0;text-align:center;">
  <img src="${imgSrc}" alt="${currentAlt || ''}" title="${currentTitle || ''}"${widthAttr}${heightAttr} ${loadingAttr} style="max-width:100%;border-radius:8px;" />
  ${currentCaption ? `<figcaption style="color:#888;font-size:0.85em;margin-top:0.5em;">${currentCaption}</figcaption>` : ''}
</figure>`

    restoreSelection()
    editorRef.current?.focus()
    document.execCommand("insertHTML", false, figureHtml)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
    setShowImageDialog(false)
    setImgSrc("")
    setImgAltAr(""); setImgAltEn("")
    setImgTitleAr(""); setImgTitleEn("")
    setImgCaptionAr(""); setImgCaptionEn("")
    setTimeout(() => { toolbarActionRef.current = false }, 0)
  }

  // Localized toolbar tooltips
  const l = (ar: string, en: string) => language === "ar" ? ar : en

  return (
    <div className="border border-border rounded-lg overflow-hidden relative">
      {/* Toolbar — sticky, prevent mousedown from stealing editor focus */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 mb-9 border-b border-border bg-muted/30 flex-wrap sticky top-[57px] z-30"
        onMouseDown={(e) => e.preventDefault()}
      >
        <ToolbarBtn onClick={() => execCmd("undo")} title={l("تراجع", "Undo")}>
          <Undo2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("redo")} title={l("إعادة", "Redo")}>
          <Redo2 className="w-4 h-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        <ToolbarBtn onClick={() => execCmd("bold")} title={l("عريض", "Bold")}>
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("italic")} title={l("مائل", "Italic")}>
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("underline")} title={l("تسطير", "Underline")}>
          <Underline className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("strikeThrough")} title={l("يتوسطه خط", "Strikethrough")}>
          <Strikethrough className="w-4 h-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        <ToolbarBtn onClick={() => execCmd("formatBlock", "<h1>")} title={l("عنوان 1", "Heading 1")}>
          <Heading1 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("formatBlock", "<h2>")} title={l("عنوان 2", "Heading 2")}>
          <Heading2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("formatBlock", "<h3>")} title={l("عنوان 3", "Heading 3")}>
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("formatBlock", "<p>")} title={l("فقرة", "Paragraph")}>
          <FileText className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        {/* Alignment buttons */}
        <ToolbarBtn onClick={() => execCmd("justifyLeft")} title={l("محاذاة يسار", "Align Left")}>
          <AlignLeft className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("justifyCenter")} title={l("محاذاة وسط", "Align Center")}>
          <AlignCenter className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("justifyRight")} title={l("محاذاة يمين", "Align Right")}>
          <AlignRight className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("justifyFull")} title={l("محاذاة كاملة", "Justify")}>
          <AlignJustify className="w-4 h-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        <ToolbarBtn onClick={() => execCmd("insertUnorderedList")} title={l("قائمة نقطية", "Bullet List")}>
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("insertOrderedList")} title={l("قائمة رقمية", "Numbered List")}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCmd("formatBlock", "<blockquote>")} title={l("اقتباس", "Quote")}>
          <Quote className="w-4 h-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        <ToolbarBtn onClick={openLinkDialog} title={l("إدراج رابط", "Insert Link")}>
          <Link2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={unlink} title={l("إزالة رابط", "Remove Link")}>
          <Unlink2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={insertInlineCode} title={l("كود مضمن", "Inline Code")}>
          <Code className="w-4 h-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        {/* Insert Image button */}
        <ToolbarBtn onClick={openImageDialog} title={l("إدراج صورة", "Insert Image")}>
          <ImagePlus className="w-4 h-4" />
        </ToolbarBtn>
      </div>

      {/* Link Dialog (inline) */}
      {showLinkDialog && (
        <div className="flex items-center gap-2 p-2 border-b border-border bg-background">
          <span className="text-xs text-muted-foreground">{l("رابط:", "URL:")}</span>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="text-sm flex-1"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertLink() } }}
          />
          <Button size="sm" onClick={insertLink} className="bg-brand hover:bg-brand-dark text-brand-foreground">
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowLinkDialog(false); setLinkUrl("") }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Image Insertion Dialog (inline) */}
      {showImageDialog && (
        <div className="p-3 border-b border-border bg-background space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{l("إدراج صورة في المحتوى", "Insert Image in Content")}</span>
            <Button size="sm" variant="ghost" onClick={() => setShowImageDialog(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Image source — upload or URL */}
          <div className="flex items-center gap-3">
            <Input type="file" accept="image/*" onChange={handleInlineImageUpload} disabled={imgUploading} className="text-sm flex-1" />
            {imgUploading && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
          </div>
          {imgSrc && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{l("رابط الصورة:", "Image URL:")}</span>
              <Input value={imgSrc} onChange={(e) => setImgSrc(e.target.value)} className="text-xs flex-1" readOnly={imgSrc.startsWith("/uploads")} />
            </div>
          )}
          {!imgSrc && (
            <div>
              <Label className="text-xs">{l("أو أدخل رابط صورة:", "Or enter image URL:")}</Label>
              <Input value={imgSrc} onChange={(e) => setImgSrc(e.target.value)} placeholder="https://example.com/image.jpg" className="text-sm" />
            </div>
          )}

          {/* Bilingual alt/title/caption fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{l("وصف الصورة", "Alt")} (عربي)</Label>
              <Input value={imgAltAr} onChange={(e) => setImgAltAr(e.target.value)} placeholder={l("وصف الصورة بالعربي", "Image description in Arabic")} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">{l("وصف الصورة", "Alt")} (English)</Label>
              <Input value={imgAltEn} onChange={(e) => setImgAltEn(e.target.value)} placeholder="Image description in English" className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">{l("عنوان", "Title")} (عربي)</Label>
              <Input value={imgTitleAr} onChange={(e) => setImgTitleAr(e.target.value)} placeholder={l("عنوان الصورة بالعربي", "Image title in Arabic")} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">{l("عنوان", "Title")} (English)</Label>
              <Input value={imgTitleEn} onChange={(e) => setImgTitleEn(e.target.value)} placeholder="Image title in English" className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">{l("وصف تحت الصورة", "Caption")} (عربي)</Label>
              <Input value={imgCaptionAr} onChange={(e) => setImgCaptionAr(e.target.value)} placeholder={l("وصف تحت الصورة بالعربي", "Caption in Arabic")} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">{l("وصف تحت الصورة", "Caption")} (English)</Label>
              <Input value={imgCaptionEn} onChange={(e) => setImgCaptionEn(e.target.value)} placeholder="Caption in English" className="text-xs" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button onClick={insertImage} className="bg-brand hover:bg-brand-dark text-brand-foreground text-sm">
              <ImagePlus className="w-3.5 h-3.5 mr-1" />
              {l("إدراج", "Insert")}
            </Button>
          </div>
        </div>
      )}

      {/* Custom heading styles for WYSIWYG editor */}
      <style dangerouslySetInnerHTML={{ __html: `
        [data-placeholder].prose h1, [data-placeholder] h1 { font-size: 1.875rem !important; font-weight: 800 !important; margin: 1em 0 0.4em !important; line-height: 1.2 !important; color: var(--foreground) !important; letter-spacing: -0.01em !important; }
        [data-placeholder].prose h2, [data-placeholder] h2 { font-size: 1.5rem !important; font-weight: 700 !important; margin: 0.8em 0 0.3em !important; line-height: 1.25 !important; color: var(--foreground) !important; }
        [data-placeholder].prose h3, [data-placeholder] h3 { font-size: 1.25rem !important; font-weight: 600 !important; margin: 0.6em 0 0.2em !important; line-height: 1.3 !important; color: var(--foreground) !important; }
        [data-placeholder] a, [data-placeholder].prose a { color: #2563eb !important; text-decoration: underline !important; text-underline-offset: 2px !important; cursor: pointer !important; }
        [data-placeholder] a:hover, [data-placeholder].prose a:hover { color: #1d4ed8 !important; }
        [data-placeholder] blockquote, [data-placeholder].prose blockquote { border-right: 4px solid #e5e7eb !important; padding: 0.5em 1em !important; margin: 1em 0 !important; color: #6b7280 !important; font-style: italic !important; }
        [data-placeholder] ul, [data-placeholder].prose ul { list-style-type: disc !important; padding-left: 1.5em !important; margin: 0.5em 0 !important; }
        [data-placeholder] ol, [data-placeholder].prose ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin: 0.5em 0 !important; }
        [data-placeholder] li { margin: 0.25em 0 !important; }
        [data-placeholder] code.inline-code { background: #f3f4f6 !important; padding: 2px 6px !important; border-radius: 4px !important; font-size: 0.875em !important; font-family: monospace !important; }
      ` }} />
      {/* WYSIWYG Editable Area — MAGIC_CONTENTEDITABLE_MARKER div */}
      <div
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseUp={handleEditorMouseUp}
        onKeyUp={handleEditorMouseUp}
        className="min-h-[300px] pt-8 px-4 pb-4 text-sm leading-relaxed focus:outline-none bg-white dark:bg-background prose prose-sm sm:prose-base max-w-none dark:prose-invert"
        style={{ wordBreak: "break-word" }}
        data-placeholder={placeholder}
      />

      {/* Placeholder overlay when empty */}
      {!value && !isFocused && (
        <div
          className="absolute pointer-events-none p-4 text-muted-foreground text-sm"
          style={{ top: 44 }}
        >
          {placeholder}
        </div>
      )}
    </div>
  )
}

// ============================================
// Image Upload Component
// With alt/title/caption fields per language
// ============================================

function ImageUploader({ onImageAdded, language }: { onImageAdded: (img: any) => void, language: Locale }) {
  const [uploading, setUploading] = useState(false)
  const [altAr, setAltAr] = useState("")
  const [altEn, setAltEn] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [captionAr, setCaptionAr] = useState("")
  const [captionEn, setCaptionEn] = useState("")

  const l = (ar: string, en: string) => language === "ar" ? ar : en

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadForm = new FormData()
      uploadForm.append("file", file)
      uploadForm.append("altAr", altAr)
      uploadForm.append("altEn", altEn)
      uploadForm.append("titleAr", titleAr)
      uploadForm.append("titleEn", titleEn)

      const res = await fetch("/api/blog/upload", { method: "POST", body: uploadForm })
      if (res.ok) {
        const data = await res.json()
        onImageAdded({
          ...data,
          captionAr,
          captionEn,
        })
        toast.success(l("تم رفع الصورة", "Image uploaded"))
        setAltAr(""); setAltEn(""); setTitleAr(""); setTitleEn("")
        setCaptionAr(""); setCaptionEn("")
      } else {
        const err = await res.json()
        toast.error(err.error || l("فشل رفع الصورة", "Upload failed"))
      }
    } catch {
      toast.error(l("فشل رفع الصورة", "Upload failed"))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg">
      <Label className="text-sm font-medium">
        {l("رفع صورة جديدة", "Upload New Image")}
      </Label>

      {/* Bilingual fields: alt, title, caption */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{l("وصف", "Alt")} (عربي)</Label>
          <Input value={altAr} onChange={(e) => setAltAr(e.target.value)} placeholder={l("وصف الصورة بالعربي", "Image description in Arabic")} className="text-sm" />
        </div>
        <div>
          <Label className="text-xs">{l("وصف", "Alt")} (English)</Label>
          <Input value={altEn} onChange={(e) => setAltEn(e.target.value)} placeholder="Image description in English" className="text-sm" />
        </div>
        <div>
          <Label className="text-xs">{l("عنوان", "Title")} (عربي)</Label>
          <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder={l("عنوان الصورة بالعربي", "Image title in Arabic")} className="text-sm" />
        </div>
        <div>
          <Label className="text-xs">{l("عنوان", "Title")} (English)</Label>
          <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Image title in English" className="text-sm" />
        </div>
        <div>
          <Label className="text-xs">{l("وصف تحت الصورة", "Caption")} (عربي)</Label>
          <Input value={captionAr} onChange={(e) => setCaptionAr(e.target.value)} placeholder={l("وصف تحت الصورة بالعربي", "Caption in Arabic")} className="text-sm" />
        </div>
        <div>
          <Label className="text-xs">{l("وصف تحت الصورة", "Caption")} (English)</Label>
          <Input value={captionEn} onChange={(e) => setCaptionEn(e.target.value)} placeholder="Caption in English" className="text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="text-sm" />
        {uploading && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
      </div>
    </div>
  )
}

// ============================================
// Image Manager — Manage all images in a post
// Shows alt/title/caption per language per image
// ============================================

function ImageManager({ images, onUpdate, onDelete, language }: {
  images: BlogImageType[]
  onUpdate: (id: string, data: any) => void
  onDelete: (id: string) => void
  language: Locale
}) {
  const l = (ar: string, en: string) => language === "ar" ? ar : en

  return (
    <div className="space-y-3">
      {images.map((img) => (
        <Card key={img.id} className="border-border/50">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={language === "ar" ? (img.altAr || "") : (img.altEn || "")} className="w-20 h-20 rounded-lg object-cover" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">{l("وصف", "Alt")} عربي</Label>
                  <Input value={img.altAr || ""} onChange={(e) => onUpdate(img.id, { altAr: e.target.value })} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">{l("وصف", "Alt")} English</Label>
                  <Input value={img.altEn || ""} onChange={(e) => onUpdate(img.id, { altEn: e.target.value })} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">{l("عنوان", "Title")} عربي</Label>
                  <Input value={img.titleAr || ""} onChange={(e) => onUpdate(img.id, { titleAr: e.target.value })} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">{l("عنوان", "Title")} English</Label>
                  <Input value={img.titleEn || ""} onChange={(e) => onUpdate(img.id, { titleEn: e.target.value })} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">{l("وصف تحت", "Caption")} عربي</Label>
                  <Input value={img.captionAr || ""} onChange={(e) => onUpdate(img.id, { captionAr: e.target.value })} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">{l("وصف تحت", "Caption")} English</Label>
                  <Input value={img.captionEn || ""} onChange={(e) => onUpdate(img.id, { captionEn: e.target.value })} className="text-xs" />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onDelete(img.id)} className="text-destructive hover:bg-destructive/10 mt-1">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {images.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-4">
          {l("لا صور حالياً — أضف صور من المحرر أو من قسم الصور", "No images yet — add images from the editor or the images section")}
        </p>
      )}
    </div>
  )
}

// ============================================
// Tags Input Component
// ============================================

function TagsInput({ tags, onChange, language }: {
  tags: string[]
  onChange: (tags: string[]) => void
  language: Locale
}) {
  const [input, setInput] = useState("")
  const l = (ar: string, en: string) => language === "ar" ? ar : en

  const addTag = () => {
    const tag = input.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
      setInput("")
    }
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
          placeholder={l("أضف علامة جديدة...", "Add a tag...")}
          className="text-sm"
        />
        <Button size="sm" variant="outline" onClick={addTag}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-destructive/20 transition-colors" onClick={() => removeTag(tag)}>
              {tag} <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// Main Blog Admin Component
// ============================================

export function BlogAdminContent({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langStr } = use(params)
  const language = langStr as Locale

  // Helper for localized strings
  const l = (ar: string, en: string) => language === "ar" ? ar : en

  // Posts list state
  const [posts, setPosts] = useState<BlogPostType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Editor state
  const [editingPost, setEditingPost] = useState<BlogPostType | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<"ar" | "en">("ar")

  // Form data for new/edit post
  const [formData, setFormData] = useState({
    slug: "",
    titleAr: "",
    titleEn: "",
    contentAr: "",
    contentEn: "",
    excerptAr: "",
    excerptEn: "",
    coverImage: "",
    coverImageAltAr: "",
    coverImageAltEn: "",
    coverImageTitleAr: "",
    coverImageTitleEn: "",
    category: "",
    tags: [] as string[],
    metaTitleAr: "",
    metaTitleEn: "",
    metaDescAr: "",
    metaDescEn: "",
    status: "DRAFT",
    featured: false,
  })

  // Images state
  const [postImages, setPostImages] = useState<BlogImageType[]>([])
  const [saving, setSaving] = useState(false)

  // ============================================
  // Load posts
  // ============================================
  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/blog?admin=true&limit=100")
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch {
      toast.error(l("فشل تحميل المقالات", "Failed to load posts"))
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => { loadPosts() }, [loadPosts])

  // ============================================
  // Start editing a post
  // ============================================
  const startEdit = (post: BlogPostType) => {
    setEditingPost(post)
    setIsCreating(false)
    setFormData({
      slug: post.slug,
      titleAr: post.titleAr,
      titleEn: post.titleEn,
      contentAr: post.contentAr,
      contentEn: post.contentEn,
      excerptAr: post.excerptAr || "",
      excerptEn: post.excerptEn || "",
      coverImage: post.coverImage || "",
      coverImageAltAr: post.coverImageAltAr || "",
      coverImageAltEn: post.coverImageAltEn || "",
      coverImageTitleAr: post.coverImageTitleAr || "",
      coverImageTitleEn: post.coverImageTitleEn || "",
      category: post.category || "",
      tags: post.tags ? JSON.parse(post.tags) : [],
      metaTitleAr: post.metaTitleAr || "",
      metaTitleEn: post.metaTitleEn || "",
      metaDescAr: post.metaDescAr || "",
      metaDescEn: post.metaDescEn || "",
      status: post.status,
      featured: post.featured,
    })
    setPostImages(post.images || [])
    setActiveTab("ar")
  }

  // ============================================
  // Start creating a new post
  // ============================================
  const startCreate = () => {
    setIsCreating(true)
    setEditingPost(null)
    setFormData({
      slug: "", titleAr: "", titleEn: "", contentAr: "", contentEn: "",
      excerptAr: "", excerptEn: "",
      coverImage: "", coverImageAltAr: "", coverImageAltEn: "",
      coverImageTitleAr: "", coverImageTitleEn: "",
      category: "", tags: [],
      metaTitleAr: "", metaTitleEn: "", metaDescAr: "", metaDescEn: "",
      status: "DRAFT", featured: false,
    })
    setPostImages([])
    setActiveTab("ar")
  }

  // ============================================
  // Save post (create or update)
  // ============================================
  const handleSave = async () => {
    if (!formData.titleAr || !formData.titleEn || !formData.contentAr || !formData.contentEn) {
      toast.error(l("العنوان والمحتوى بالعربي والإنجليزي مطلوب", "Title and content in both languages required"))
      return
    }

    let slug = formData.slug
    if (!slug) {
      slug = formData.titleEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }

    setSaving(true)
    try {
      const body = {
        ...formData,
        slug,
        images: postImages.map(img => ({
          url: img.url, altAr: img.altAr, altEn: img.altEn,
          titleAr: img.titleAr, titleEn: img.titleEn,
          captionAr: img.captionAr, captionEn: img.captionEn,
        })),
      }

      if (isCreating) {
        const res = await fetch("/api/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const data = await res.json()
          setPosts(prev => [data.post, ...prev])
          toast.success(l("تم إنشاء المقال", "Post created"))
          setIsCreating(false)
          setEditingPost(data.post)
        } else {
          const err = await res.json()
          toast.error(err.error || l("فشل إنشاء المقال", "Failed to create post"))
        }
      } else if (editingPost) {
        const res = await fetch("/api/blog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingPost.id, ...formData }),
        })
        if (res.ok) {
          const data = await res.json()
          setPosts(prev => prev.map(p => p.id === editingPost.id ? data.post : p))
          toast.success(l("تم حفظ المقال", "Post saved"))
        } else {
          const err = await res.json()
          toast.error(err.error || l("فشل الحفظ", "Save failed"))
        }
      }
    } catch {
      toast.error(l("فشل الحفظ", "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Delete post
  // ============================================
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/blog?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id))
        toast.success(l("تم حذف المقال", "Post deleted"))
      } else {
        toast.error(l("فشل حذف المقال", "Failed to delete post"))
      }
    } catch {
      toast.error(l("فشل حذف المقال", "Failed to delete post"))
    }
  }

  // ============================================
  // Add image to post
  // ============================================
  const handleImageAdded = (imgData: any) => {
    const newImage: BlogImageType = {
      id: `temp_${Date.now()}`,
      url: imgData.url,
      altAr: imgData.altAr || null,
      altEn: imgData.altEn || null,
      titleAr: imgData.titleAr || null,
      titleEn: imgData.titleEn || null,
      captionAr: imgData.captionAr || null,
      captionEn: imgData.captionEn || null,
      position: postImages.length,
    }
    setPostImages(prev => [...prev, newImage])
  }

  // ============================================
  // Update image metadata
  // ============================================
  const handleImageUpdate = async (id: string, data: any) => {
    if (id.startsWith("temp_")) {
      setPostImages(prev => prev.map(img => img.id === id ? { ...img, ...data } : img))
      return
    }
    try {
      await fetch("/api/blog/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })
      setPostImages(prev => prev.map(img => img.id === id ? { ...img, ...data } : img))
    } catch {
      toast.error(l("فشل تحديث الصورة", "Failed to update image"))
    }
  }

  // ============================================
  // Delete image from post
  // ============================================
  const handleImageDelete = async (id: string) => {
    if (id.startsWith("temp_")) {
      setPostImages(prev => prev.filter(img => img.id !== id))
      return
    }
    try {
      await fetch(`/api/blog/images?id=${id}`, { method: "DELETE" })
      setPostImages(prev => prev.filter(img => img.id !== id))
    } catch {
      toast.error(l("فشل حذف الصورة", "Failed to delete image"))
    }
  }

  // ============================================
  // Cover image upload
  // ============================================
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const coverFormData = new FormData()
      coverFormData.append("file", file)
      coverFormData.append("altAr", formData.coverImageAltAr || "")
      coverFormData.append("altEn", formData.coverImageAltEn || "")

      const res = await fetch("/api/blog/upload", { method: "POST", body: coverFormData })
      if (res.ok) {
        const data = await res.json()
        setFormData(prev => ({ ...prev, coverImage: data.url }))
        toast.success(l("تم رفع صورة الغلاف", "Cover image uploaded"))
      } else {
        toast.error(l("فشل رفع صورة الغلاف", "Failed to upload cover image"))
      }
    } catch {
      toast.error(l("فشل رفع صورة الغلاف", "Failed to upload cover image"))
    }
  }

  // ============================================
  // Status badge helper — LOCALIZED
  // ============================================
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED": return <Badge className="bg-emerald-600 text-white">{l("منشور", "Published")}</Badge>
      case "DRAFT": return <Badge className="bg-slate-600 text-white">{l("مسودة", "Draft")}</Badge>
      case "REVIEW": return <Badge className="bg-yellow-600 text-white">{l("مراجعة", "Review")}</Badge>
      case "ARCHIVED": return <Badge className="bg-red-600 text-white">{l("مؤرشف", "Archived")}</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  // ============================================
  // RENDER — Post List Mode
  // ============================================
  if (!isCreating && !editingPost) {
    const filteredPosts = posts.filter(p =>
      p.titleAr.includes(search) || p.titleEn.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
    )

    return (
      <div className="p-4 sm:p-6 max-w-5xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {l("إدارة المدونة", "Blog Management")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {l("إنشاء وتعديل ونشر المقالات", "Create, edit, and publish articles")}
            </p>
          </div>
          <Button onClick={startCreate} className="bg-brand hover:bg-brand-dark text-brand-foreground min-h-[44px]">
            <Plus className="w-4 h-4 mr-2" />
            {l("مقال جديد", "New Post")}
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={l("بحث في المقالات...", "Search posts...")}
            className="max-w-sm"
          />
          <span className="text-muted-foreground text-xs">{filteredPosts.length} {l("مقال", "posts")}</span>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
        ) : filteredPosts.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{l("لا مقالات حالياً — ابدأ بإنشاء أول مقال", "No posts yet — create your first article")}</p>
              <Button onClick={startCreate} className="mt-4 bg-brand hover:bg-brand-dark text-brand-foreground">
                <Plus className="w-4 h-4 mr-2" />
                {l("مقال جديد", "New Post")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map(post => (
              <Card key={post.id} className="border-border/50 hover:border-brand/30 transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Cover image thumbnail */}
                  {post.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.coverImage} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Post info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium truncate">{language === "ar" ? post.titleAr : post.titleEn}</p>
                      {post.featured && <Star className="w-3.5 h-3.5 text-brand fill-brand" />}
                      {getStatusBadge(post.status)}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">/{post.slug} — {post.views} {l("مشاهدات", "views")} — {new Date(post.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(post)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(post.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // RENDER — Editor Mode (Create/Edit)
  // ============================================
  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-4" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header — Sticky with save button always accessible */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm py-2 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-border/50 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setIsCreating(false); setEditingPost(null) }} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {isCreating ? l("مقال جديد", "New Post") : l("تعديل المقال", "Edit Post")}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
            <SelectTrigger className="w-28 min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">{l("مسودة", "Draft")}</SelectItem>
              <SelectItem value="REVIEW">{l("مراجعة", "Review")}</SelectItem>
              <SelectItem value="PUBLISHED">{l("منشور", "Published")}</SelectItem>
              <SelectItem value="ARCHIVED">{l("مؤرشف", "Archived")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={formData.featured} onCheckedChange={(v) => setFormData(prev => ({ ...prev, featured: v }))} />
            <Label className="text-xs">{l("مميز", "Featured")}</Label>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand-dark text-brand-foreground min-h-[44px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {l("حفظ", "Save")}
          </Button>
        </div>
        </div>
      </div>

      {/* Language Tab Switch — sticky below header */}
      <div className="sticky top-[52px] z-30 bg-background/95 backdrop-blur-sm -mx-4 sm:-mx-6 px-4 sm:px-6 pb-2">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ar" | "en")} className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="ar" className="flex items-center gap-1">
            <Globe className="w-3 h-3" /> عربي
          </TabsTrigger>
          <TabsTrigger value="en" className="flex items-center gap-1">
            <Globe className="w-3 h-3" /> English
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* Arabic Content Tab */}
        {/* ============================================ */}
        <TabsContent value="ar" className="space-y-4">
          {/* Slug + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">{l("رابط المقال", "Slug (URL)")}</Label>
              <Input value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))} placeholder="article-url-slug" className="text-sm" />
            </div>
            <div>
              <Label className="text-sm">{l("التصنيف", "Category")}</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                <SelectTrigger><SelectValue placeholder={l("اختر تصنيف", "Select category")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="tips">Tips & Guides</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm">{l("العلامات", "Tags")}</Label>
            <TagsInput tags={formData.tags} onChange={(tags) => setFormData(prev => ({ ...prev, tags }))} language={language} />
          </div>

          {/* Title */}
          <div>
            <Label className="text-sm font-medium">{l("العنوان", "Title")} (عربي)</Label>
            <Input value={formData.titleAr} onChange={(e) => setFormData(prev => ({ ...prev, titleAr: e.target.value }))} placeholder={l("عنوان المقال بالعربي", "Article title in Arabic")} className="text-lg font-semibold" />
          </div>

          {/* Excerpt */}
          <div>
            <Label className="text-sm">{l("ملخص مختصر", "Excerpt")} (عربي)</Label>
            <Textarea value={formData.excerptAr} onChange={(e) => setFormData(prev => ({ ...prev, excerptAr: e.target.value }))} placeholder={l("ملخص المقال للعرض في صفحة البلوق", "Brief summary for blog listing page")} rows={2} className="text-sm" />
          </div>

      {/* ============================================ */}
      {/* Cover Image Section */}
      {/* ============================================ */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {l("صورة الغلاف", "Cover Image")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={formData.coverImage} alt="Cover" className="w-full max-h-48 rounded-lg object-cover" />
          )}
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" onChange={handleCoverUpload} className="text-sm max-w-xs" />
            {formData.coverImage && (
              <Button variant="ghost" size="sm" onClick={() => setFormData(prev => ({ ...prev, coverImage: "" }))}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{l("وصف", "Alt")} (عربي)</Label>
              <Input value={formData.coverImageAltAr} onChange={(e) => setFormData(prev => ({ ...prev, coverImageAltAr: e.target.value }))} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">{l("وصف", "Alt")} (English)</Label>
              <Input value={formData.coverImageAltEn} onChange={(e) => setFormData(prev => ({ ...prev, coverImageAltEn: e.target.value }))} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">{l("عنوان", "Title")} (عربي)</Label>
              <Input value={formData.coverImageTitleAr} onChange={(e) => setFormData(prev => ({ ...prev, coverImageTitleAr: e.target.value }))} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs">{l("عنوان", "Title")} (English)</Label>
              <Input value={formData.coverImageTitleEn} onChange={(e) => setFormData(prev => ({ ...prev, coverImageTitleEn: e.target.value }))} className="text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

          {/* WYSIWYG Rich Content Editor — Arabic */}
          <div>
            <Label className="text-sm font-medium">{l("المحتوى", "Content")} (عربي) — {l("محرر WYSIWYG", "WYSIWYG Editor")}</Label>
            <WysiwygEditor
              value={formData.contentAr}
              onChange={(html) => setFormData(prev => ({ ...prev, contentAr: html }))}
              placeholder={l("اكتب محتوى المقال هنا... استخدم الأدوات فوق لتنسيق النص (بولد، رابط، صورة، محاذاة...)", "Write article content here... Use toolbar to format text (bold, link, image, alignment...)")}
              language={language}
            />
          </div>

          {/* SEO */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">{l("تحسين محركات البحث", "SEO")} (عربي)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-xs">Meta Title</Label>
                <Input value={formData.metaTitleAr} onChange={(e) => setFormData(prev => ({ ...prev, metaTitleAr: e.target.value }))} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Meta Description</Label>
                <Textarea value={formData.metaDescAr} onChange={(e) => setFormData(prev => ({ ...prev, metaDescAr: e.target.value }))} rows={2} className="text-xs" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* English Content Tab */}
        {/* ============================================ */}
        <TabsContent value="en" className="space-y-4">
          {/* Tags (shared) */}
          <div>
            <Label className="text-sm">{l("العلامات", "Tags")} (shared)</Label>
            <TagsInput tags={formData.tags} onChange={(tags) => setFormData(prev => ({ ...prev, tags }))} language={language} />
          </div>

          {/* Title */}
          <div>
            <Label className="text-sm font-medium">{l("العنوان", "Title")} (English)</Label>
            <Input value={formData.titleEn} onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))} placeholder="Article title in English" className="text-lg font-semibold" />
          </div>

          {/* Excerpt */}
          <div>
            <Label className="text-sm">{l("ملخص مختصر", "Excerpt")} (English)</Label>
            <Textarea value={formData.excerptEn} onChange={(e) => setFormData(prev => ({ ...prev, excerptEn: e.target.value }))} placeholder="Brief summary for blog listing page" rows={2} className="text-sm" />
          </div>

          {/* WYSIWYG Rich Content Editor — English */}
          <div>
            <Label className="text-sm font-medium">{l("المحتوى", "Content")} (English) — {l("محرر WYSIWYG", "WYSIWYG Editor")}</Label>
            <WysiwygEditor
              value={formData.contentEn}
              onChange={(html) => setFormData(prev => ({ ...prev, contentEn: html }))}
              placeholder={l("اكتب محتوى المقال هنا... استخدم الأدوات فوق لتنسيق النص (بولد، رابط، صورة، محاذاة...)", "Write article content here... Use toolbar to format text (bold, link, image, alignment...)")}
              language={language}
            />
          </div>

          {/* SEO */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">{l("تحسين محركات البحث", "SEO")} (English)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-xs">Meta Title</Label>
                <Input value={formData.metaTitleEn} onChange={(e) => setFormData(prev => ({ ...prev, metaTitleEn: e.target.value }))} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Meta Description</Label>
                <Textarea value={formData.metaDescEn} onChange={(e) => setFormData(prev => ({ ...prev, metaDescEn: e.target.value }))} rows={2} className="text-xs" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* ============================================ */}
      {/* Article Images Section */}
      {/* ============================================ */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {l("صور المقال", "Article Images")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageManager images={postImages} onUpdate={handleImageUpdate} onDelete={handleImageDelete} language={language} />
          <ImageUploader onImageAdded={handleImageAdded} language={language} />
        </CardContent>
      </Card>
    </div>
  )
}
