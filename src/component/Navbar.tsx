import { BookOpen, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface NavbarProps {
  onNewList?: () => void;
}

export function Navbar({ onNewList }: NavbarProps) {
  const location = useLocation();
  const isLists = location.pathname === "/lists" || location.pathname.startsWith("/list/");

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-2 px-6 py-0 h-14 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-8">
          <BookOpen size={18} className="text-primary" />
          <span className="font-black text-sm tracking-widest">
            JEJAK<span className="text-primary">BACA</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`px-3 py-1.5 text-sm font-bold transition-colors ${
              !isLists ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Home
          </Link>
          <Link
            to="/lists"
            className={`px-3 py-1.5 text-sm font-bold transition-colors ${
              isLists ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lists
          </Link>
        </nav>

        {/* Right actions */}
        {onNewList && (
          <div className="ml-auto">
            <button
              onClick={onNewList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all shadow-sm shadow-primary/20"
            >
              <Plus size={14} /> New List
            </button>
          </div>
        )}
      </div>
    </header>
  );
}