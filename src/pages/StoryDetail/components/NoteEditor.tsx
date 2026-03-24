import { useState, useRef, useEffect } from "react";
import { Input } from "@/component/ui/input";
import { Button } from "@/component/ui/button";
import {
  Bold, Italic, Underline, Eye,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, Link as LinkIcon, ListOrdered,
} from "lucide-react";

export function NoteEditor({ content, onChange, placeholder }: {
  content: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const edRef = useRef<HTMLDivElement>(null);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl]   = useState("");

  useEffect(() => {
    if (edRef.current && edRef.current.innerHTML !== content)
      edRef.current.innerHTML = content || "";
  }, [content]);

  const sync    = () => { if (edRef.current) onChange(edRef.current.innerHTML); };
  const exec    = (cmd: string, val?: string) => { edRef.current?.focus(); document.execCommand(cmd, false, val); sync(); };
  const insHtml = (html: string) => { edRef.current?.focus(); document.execCommand("insertHTML", false, html); sync(); };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    exec("createLink", linkUrl.trim());
    setLinkUrl(""); setShowLink(false);
  };

  const TB = ({
    a, title, children,
  }: {
    a: () => void; title: string; children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); a(); }}
      title={title}
      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card flex flex-col">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-border bg-secondary/30">

        {/* Headings */}
        <TB a={() => exec("formatBlock", "h1")} title="H1">
          <span className="font-bold text-[10px] w-5 text-center">H1</span>
        </TB>
        <TB a={() => exec("formatBlock", "h2")} title="H2">
          <span className="font-bold text-[10px] w-5 text-center">H2</span>
        </TB>
        <TB a={() => exec("formatBlock", "h3")} title="H3">
          <span className="font-bold text-[10px] w-5 text-center">H3</span>
        </TB>

        <div className="w-px bg-border mx-0.5 self-stretch"/>

        {/* Inline formatting */}
        <TB a={() => exec("bold")}      title="Bold">      <Bold      className="w-3.5 h-3.5"/></TB>
        <TB a={() => exec("italic")}    title="Italic">    <Italic    className="w-3.5 h-3.5"/></TB>
        <TB a={() => exec("underline")} title="Underline"> <Underline className="w-3.5 h-3.5"/></TB>
        <TB
          a={() => insHtml(`<span class="spoiler" title="click/hover to reveal">[spoiler]</span>`)}
          title="Spoiler"
        >
          <Eye className="w-3.5 h-3.5"/>
        </TB>

        <div className="w-px bg-border mx-0.5 self-stretch"/>

        {/* Alignment */}
        <TB a={() => exec("justifyLeft")}   title="Left">    <AlignLeft    className="w-3.5 h-3.5"/></TB>
        <TB a={() => exec("justifyCenter")} title="Center">  <AlignCenter  className="w-3.5 h-3.5"/></TB>
        <TB a={() => exec("justifyRight")}  title="Right">   <AlignRight   className="w-3.5 h-3.5"/></TB>
        <TB a={() => exec("justifyFull")}   title="Justify"> <AlignJustify className="w-3.5 h-3.5"/></TB>

        <div className="w-px bg-border mx-0.5 self-stretch"/>

        {/* Lists */}
        <TB a={() => exec("insertUnorderedList")} title="Bullet list">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="9" y1="6"  x2="20" y2="6"/>
            <line x1="9" y1="12" x2="20" y2="12"/>
            <line x1="9" y1="18" x2="20" y2="18"/>
            <circle cx="4" cy="6"  r="1.2" fill="currentColor"/>
            <circle cx="4" cy="12" r="1.2" fill="currentColor"/>
            <circle cx="4" cy="18" r="1.2" fill="currentColor"/>
          </svg>
        </TB>
        <TB a={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5"/>
        </TB>

        <div className="w-px bg-border mx-0.5 self-stretch"/>

        {/* Link & Divider */}
        <TB a={() => setShowLink(v => !v)} title="Insert link">
          <LinkIcon className="w-3.5 h-3.5"/>
        </TB>
        <TB
          a={() => insHtml(`<hr style="border:none;border-top:1px solid #555;margin:10px 0;"/><br/>`)}
          title="Divider"
        >
          <Minus className="w-3.5 h-3.5"/>
        </TB>
      </div>

      {/* Link input row */}
      {showLink && (
        <div className="flex gap-2 px-2 py-1.5 border-b border-border bg-secondary/20">
          <Input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="h-7 text-xs bg-card flex-1"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); insertLink(); } }}
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs" onClick={insertLink}>OK</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowLink(false)}>✕</Button>
        </div>
      )}

      {/* Editable area */}
      <div
        ref={edRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        data-placeholder={placeholder || "Tulis catatanmu..."}
        className="
          min-h-[180px] max-h-[50vh] overflow-y-auto p-3 text-sm text-foreground
          outline-none leading-relaxed
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2
          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-1.5
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
          [&_li]:mb-0.5
          [&_a]:text-primary [&_a]:underline
          [&_hr]:border-t [&_hr]:border-border [&_hr]:my-3
          empty:before:content-[attr(data-placeholder)]
          empty:before:text-muted-foreground
          empty:before:pointer-events-none
        "
      />
    </div>
  );
}