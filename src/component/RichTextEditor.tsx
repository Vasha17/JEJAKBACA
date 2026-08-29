import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { Mark, mergeAttributes } from "@tiptap/core";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline, Strikethrough, Eye,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Link2, Minus, ImageIcon, Loader2, Maximize2, X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

// ─── Note Image (fixed size + click-to-zoom) ───────────────────────────────────
function NoteImageComponent({ node }: any) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <NodeViewWrapper as="div" className="inline-block" contentEditable={false}>
      <div
        className="group relative inline-block rounded-lg overflow-hidden cursor-zoom-in"
        style={{ width: 320 }}
        onClick={() => setLightboxOpen(true)}
      >
        <img src={node.attrs.src} alt={node.attrs.alt || ""} className="block w-full h-auto rounded-lg" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {lightboxOpen && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={node.attrs.src}
            alt={node.attrs.alt || ""}
            className="h-[80vh] sm:h-screen w-auto max-w-[92vw] sm:max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </NodeViewWrapper>
  );
}

const NoteImage = ImageExt.extend({
  addNodeView() {
    return ReactNodeViewRenderer(NoteImageComponent);
  },
});

// ─── Custom Spoiler Mark ───────────────────────────────────────────────────────
const Spoiler = Mark.create({
  name: "spoiler",
  parseHTML() {
    return [{ tag: "span.spoiler" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "spoiler" }),
      0,
    ];
  },
  addCommands() {
    return {
      toggleSpoiler:
        () =>
        ({ editor, chain }: any) => {
          if (editor.isActive("spoiler")) {
            return chain().unsetMark("spoiler").run();
          }
          return chain().setMark("spoiler").run();
        },
    } as any;
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const EDITOR_STYLE = ` 
  .ProseMirror .spoiler {
    background-color: hsl(var(--muted-foreground) / 0.9);
    color: transparent;
    border-radius: 4px;
    padding: 0 3px;
    cursor: pointer;
    user-select: none;
  }
  
  .ProseMirror .spoiler:hover {
    color: hsl(var(--foreground)) !important;
    background-color: hsl(var(--accent));
  }
  
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: hsl(var(--muted-foreground));
    pointer-events: none;
    height: 0;
  }
`;

const DISPLAY_STYLE = `  
    .spoiler-view p:empty {
    min-height: 1.5em;
  }

  .spoiler-view p:empty::before {
    content: "\u00a0";
  }

  .note-img-wrap {
    position: relative;
    display: inline-block;
    cursor: zoom-in;
    width: 320px;
    max-width: 20%;
    overflow: hidden;
    border-radius: 8px;
  }

  .note-img-wrap img {
    border-radius: 8px;
    display: block;
  }

  .note-img-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0);
    border-radius: 8px;
    opacity: 0;
    transition: opacity 0.2s ease, background 0.2s ease;
    color: white;
    pointer-events: none;
  }

  .note-img-wrap:hover .note-img-overlay {
    opacity: 1;
    background: rgba(0,0,0,0.2);
  }

  .note-img-zoom-icon {
    display: block;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    aspect-ratio: 1 / 1;
  }

  .spoiler-view .spoiler {
    background-color: hsl(var(--muted-foreground) / 0.9); 
    color: transparent !important;
    border-radius: 4px;
    padding: 0 3px;
    cursor: pointer;
    user-select: none; /* Biar ga bisa di-select pas ketutup */
    transition: all 0.2s ease;
  }

  .spoiler-view .spoiler:hover {
    color: hsl(var(--foreground)) !important; /* INI MEMASTIKAN TEKS PUTIH */
    background-color: hsl(var(--muted-foreground) / 0.9) !important; 
  }

  .spoiler-view .spoiler.revealed {
    color: hsl(var(--foreground)) !important;
    background-color: transparent !important;
    user-select: text;
  }
 
  @media (hover: hover) {
    .spoiler-view .spoiler:hover {
      color: hsl(var(--foreground)) !important;
    }
  }
`;

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

// ─── RichTextEditor ───────────────────────────────────────────────────────────
export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your notes here...",
  className,
  onImageUpload,
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
      }),
      UnderlineExt,
      Spoiler,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      LinkExt.configure({ autolink: true, openOnClick: false, linkOnPaste: true }),
      NoteImage.configure({ HTMLAttributes: { class: "rounded-lg" } }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
      onBlur: ({ editor }) => {      
      onChange(editor.getHTML());   
    },                              
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-sm text-foreground",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content || "", false);
    }
  }, [content, editor]);

  if (!editor) return null;

  const TB = ({
    active = false,
    onClick,
    title,
    children,
  }: {
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/80",
        active && "bg-primary/20 text-primary"
      )}
    >
      {children}
    </button>
  );

  const handleInsertLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
    setLinkUrl("");
    setShowLinkInput(false);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) { e.target.value = ""; return; }
    setImageUploading(true);
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload image.");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  };

  const words = editor.storage.characterCount?.words() ?? 0;
  const chars = editor.storage.characterCount?.characters() ?? 0;

  return (
    <>
      <style>{EDITOR_STYLE}</style>
      <div className={cn("border border-border rounded-lg overflow-hidden bg-card flex flex-col", className)}>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-secondary/30 select-none">

          {/* Headings */}
          <TB active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
            <Heading1 className="w-4 h-4" />
          </TB>
          <TB active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </TB>
          <TB active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
            <Heading3 className="w-4 h-4" />
          </TB>

          <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

          {/* Text formatting */}
          <TB active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <Bold className="w-3.5 h-3.5" />
          </TB>
          <TB active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <Italic className="w-3.5 h-3.5" />
          </TB>
          <TB active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <Underline className="w-3.5 h-3.5" />
          </TB>
          {/* Strikethrough — antara Underline dan Spoiler */}
          <TB active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough className="w-3.5 h-3.5" />
          </TB>
          {/* Spoiler */}
          <TB
            active={editor.isActive("spoiler")}
            onClick={() => (editor.chain().focus() as any).toggleSpoiler().run()}
            title="Spoiler (hide text)"
          >
            <Eye className="w-3.5 h-3.5" />
          </TB>

          <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

          {/* Alignment */}
          <TB active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left">
            <AlignLeft className="w-3.5 h-3.5" />
          </TB>
          <TB active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center">
            <AlignCenter className="w-3.5 h-3.5" />
          </TB>
          <TB active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right">
            <AlignRight className="w-3.5 h-3.5" />
          </TB>
          <TB active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justify">
            <AlignJustify className="w-3.5 h-3.5" />
          </TB>

          <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

          {/* Lists */}
          <TB active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
            <List className="w-3.5 h-3.5" />
          </TB>
          <TB active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
            <ListOrdered className="w-3.5 h-3.5" />
          </TB>

          <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

          {/* Link */}
          <TB
            active={editor.isActive("link") || showLinkInput}
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                setShowLinkInput((v) => !v);
              }
            }}
            title="Insert Link"
          >
            <Link2 className="w-3.5 h-3.5" />
          </TB>

          {/* Image */}
          {onImageUpload && (
            <TB
              active={false}
              onClick={() => imageFileRef.current?.click()}
              title="Insert Image"
            >
              {imageUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            </TB>
          )}
          <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />

          {/* Horizontal Rule */}
          <TB active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus className="w-3.5 h-3.5" />
          </TB>
        </div>

        {/* ── Link input bar ── */}
        {showLinkInput && (
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-secondary/20">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleInsertLink(); }
                if (e.key === "Escape") { setShowLinkInput(false); setLinkUrl(""); }
              }}
              placeholder="https://..."
              autoFocus
              className="flex-1 h-7 text-xs bg-card border border-border rounded px-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
            />
            <button
              type="button"
              onClick={handleInsertLink}
              className="h-7 px-3 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 font-medium"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Editor area ── */}
        <EditorContent editor={editor} className="flex-1" />

        {/* ── Word count footer ── */}
        <div className="flex justify-end gap-3 px-3 py-1.5 border-t border-border bg-secondary/20 text-[10px] text-muted-foreground select-none">
          <span>{words} words</span>
          <span>•</span>
          <span>{chars} characters</span>
        </div>
      </div>
    </>
  );
}

// bungkus setiap <img> mentah dengan wrapper span biar bisa dikasih overlay hover-zoom via CSS
const MAXIMIZE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="note-img-zoom-icon"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>`;

function wrapImagesForZoom(html: string): string {
  return html.replace(/<img([^>]*)>/g, (match) => {
    return `<span class="note-img-wrap">${match}<span class="note-img-overlay">${MAXIMIZE_SVG}</span></span>`;
  });
}

// ─── RichTextDisplay ──────────────────────────────────────────────────────────
export function RichTextDisplay({ html, className }: { html: string; className?: string }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {    
    const targetNode = e.target as Node;    
    const targetElement = targetNode instanceof HTMLElement ? targetNode : targetNode.parentElement;
    
    if (!targetElement) return;

    const img = targetElement.closest(".note-img-wrap")?.querySelector("img") as HTMLImageElement | null;
    if (img) {
      setLightboxSrc(img.src);
      return;
    }

    const spoiler = targetElement.closest(".spoiler") as HTMLElement | null;
    if (spoiler) {
      spoiler.classList.toggle("revealed");
    }
  };

  return (
    <>
    <style>{DISPLAY_STYLE}</style> 

      <div
        className={cn(
          "spoiler-view prose prose-sm prose-invert max-w-none text-foreground",
          className
        )}
        style={{ textAlign: "justify" }}
        dangerouslySetInnerHTML={{ __html: wrapImagesForZoom(html) }}
        onClick={handleClick}
      />

      {lightboxSrc && createPortal(
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="h-[80vh] sm:h-screen w-auto max-w-[92vw] sm:max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}