"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Wordmark } from "@/components/brand/wordmark";
import styles from "@/components/marketing/landing.module.css";

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function isScrolled() {
  return window.scrollY > 24;
}

function serverScrollState() {
  return false;
}

const navigation = [
  { href: "#funciones", label: "Qué incluye" },
  { href: "/login", label: "Iniciar sesión" },
  { href: "/registro", label: "Crear cuenta" },
];

export function PublicHeader() {
  const scrolled = useSyncExternalStore(subscribeToScroll, isScrolled, serverScrollState);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 75rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) menu.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  function closeMenu() {
    menu.current?.close();
  }

  return (
    <header className={styles.publicHeader} data-scrolled={scrolled}>
      <div className={styles.headerInner}>
        <div className="[&>span>span]:text-base sm:[&>span>span]:text-lg">
          <Wordmark href={null} />
        </div>
        <nav aria-label="Navegación principal" className={styles.headerNav}>
          {navigation.map(({ href, label }) => (
            <Link key={href} href={href} className={styles.navLink}>{label}</Link>
          ))}
        </nav>
        <button
          type="button"
          data-plain
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          aria-controls="public-navigation-menu"
          onClick={() => {
            menu.current?.showModal();
            setMenuOpen(true);
          }}
          className={`${styles.menuToggle} ${styles.menuOpener}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <dialog
        ref={menu}
        id="public-navigation-menu"
        aria-labelledby="public-navigation-title"
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMenu();
          }
        }}
        className={styles.publicMenu}
      >
        <div className={styles.menuHeading}>
          <h2 id="public-navigation-title" className="font-display text-lg font-bold">Navegación</h2>
          <button type="button" data-plain aria-label="Cerrar menú" onClick={closeMenu} className={styles.menuToggle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav aria-label="Navegación móvil" className={styles.mobileLinks}>
          {navigation.map(({ href, label }) => (
            <Link key={href} href={href} onClick={closeMenu} className={styles.navLink}>{label}</Link>
          ))}
        </nav>
      </dialog>
    </header>
  );
}
