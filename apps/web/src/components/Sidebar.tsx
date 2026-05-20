"use client";

import {
  LayoutDashboard,
  Brain,
  Trophy,
  Users,
  Puzzle,
  LogIn,
  Swords,
  HelpCircle,
  User,
  Star,
  Calendar,
  Zap,
  BarChart2,
  History,
  Globe,
  Plus,
  BookOpen,
  Lightbulb,
  Flame,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState, useCallback, memo } from "react";
import "./sidebar.css";

interface SubItem { icon: LucideIcon; name: string; desc: string; href: string; solo?: boolean; }
interface NavLink { name: string; href: string; icon: LucideIcon; description: string; subItems?: SubItem[]; }

const links: NavLink[] = [
  {
    name: "Play", href: "/play", icon: Brain, description: "Start a game",
    subItems: [
      { icon: User,     name: "Play Solo",       desc: "Practice alone, no clock",     href: "/game/solo", solo: true },
      { icon: Swords,   name: "ELO Rated Match", desc: "Compete for rating points",    href: "/play?mode=rated" },
    ],
  },
  {
    name: "Puzzles", href: "/puzzles", icon: Puzzle, description: "Daily puzzle",
    subItems: [
      { icon: Calendar, name: "Daily Puzzle",    desc: "Same puzzle for everyone",     href: "/puzzles/daily" },
      { icon: Zap,      name: "OneShot",         desc: "5 clues · one chance to guess",href: "/puzzles/oneshot" },
    ],
  },
  // Leaderboard: direct nav, no flyout
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy, description: "Top players" },

  // Rooms: direct nav, no flyout
  { name: "Rooms", href: "/rooms", icon: Users, description: "Multiplayer" },
  // Tournaments: direct nav, no flyout
  { name: "Tournaments", href: "/tournaments", icon: Swords, description: "Compete" },
  // How to Play: no flyout — direct nav
  { name: "How to Play", href: "/how-to-play", icon: HelpCircle, description: "Learn the rules" },
];

const Sidebar = memo(function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { data: session } = useSession();
  const [openIdx, setOpenIdx]   = useState<number | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenIdx(null), 120);
  }, []);

  const handleItemEnter = useCallback((idx: number) => {
    cancelClose();
    const el = wrapperRefs.current[idx];
    if (el) setFlyoutTop(el.getBoundingClientRect().top);
    setOpenIdx(idx);
  }, [cancelClose]);

  const handleSubItemClick = useCallback((item: SubItem) => {
    setOpenIdx(null);
    if (item.solo) {
      const id = `solo-${Math.random().toString(36).slice(2, 8)}`;
      router.push(`/game/${id}`);
    } else {
      router.push(item.href);
    }
  }, [router]);

  const user = session?.user;
  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const hue = (user?.email?.charCodeAt(0) ?? 0) * 37 % 360;

  return (
    <aside className="bnc-sidebar">
      {/* Logo */}
      <Link href="/" className="bnc-sidebar__logo">
        <Image src="/logo.png" alt="BnC Logo" width={32} height={32} className="bnc-sidebar__logo-img" style={{ borderRadius: "50%", overflow: "hidden" }} />
        <span className="bnc-sidebar__logo-text">Bn<span className="bnc-sidebar__logo-accent">C</span></span>
      </Link>


      {/* Nav */}
      <nav className="bnc-sidebar__nav">
        {links.map((link, idx) => {
          const active  = isActive(link.href);
          const Icon    = link.icon;
          const isOpen  = openIdx === idx;
          const hasFlyout = !!link.subItems;

          return (
            <div
              key={link.name}
              className="bnc-sidebar__item-wrapper"
              ref={(el) => { wrapperRefs.current[idx] = el; }}
              onMouseEnter={hasFlyout ? () => handleItemEnter(idx) : undefined}
              onMouseLeave={hasFlyout ? scheduleClose : undefined}
            >
              <Link
                href={link.href}
                className={`bnc-sidebar__item${active ? " bnc-sidebar__item--active" : ""}${isOpen ? " bnc-sidebar__item--open" : ""}`}
                onClick={() => setOpenIdx(null)}
              >
                <span className="bnc-sidebar__accent-bar" />
                <span className="bnc-sidebar__icon"><Icon size={19} strokeWidth={active ? 2.5 : 2} /></span>
                <span className="bnc-sidebar__label-group">
                  <span className="bnc-sidebar__label">{link.name}</span>
                  <span className="bnc-sidebar__desc">{link.description}</span>
                </span>
                <span className="bnc-sidebar__shimmer" />
              </Link>

              {hasFlyout && link.subItems && (
                <div
                  className={`bnc-flyout${isOpen ? " bnc-flyout--visible" : ""}`}
                  style={{ top: flyoutTop }}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  <div className="bnc-flyout__header"><Icon size={14} style={{ color: "#81b64c" }} /><span>{link.name}</span></div>
                  {link.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    return (
                      <button key={sub.name} className="bnc-flyout__item" onClick={() => handleSubItemClick(sub)}>
                        <span className="bnc-flyout__item-icon"><SubIcon size={15} /></span>
                        <span className="bnc-flyout__item-text">
                          <span className="bnc-flyout__item-name">{sub.name}</span>
                          <span className="bnc-flyout__item-desc">{sub.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom: profile avatar when signed in (auth buttons now in TopBar) */}
      {user && (
        <div className="bnc-sidebar__bottom">
          <Link href="/profile" className="bnc-sidebar__profile" title="Your Profile">
            <div className="bnc-sidebar__avatar" style={{ background: user.image ? "transparent" : `hsla(${hue},60%,30%,0.6)` }}>
              {user.image
                ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                : initials}
            </div>
            <div className="bnc-sidebar__label-group">
              <span className="bnc-sidebar__label" style={{ fontSize: 12 }}>{user.name?.split(" ")[0] ?? "Player"}</span>
              <span className="bnc-sidebar__desc">View profile</span>
            </div>
          </Link>
        </div>
      )}

    </aside>
  );
});

export default Sidebar;
