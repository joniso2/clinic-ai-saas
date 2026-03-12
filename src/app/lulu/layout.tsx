"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import "@/sites/lulu/styles/globals.css";
import Navbar from "@/sites/lulu/components/Navbar";
import FullMenu from "@/sites/lulu/components/FullMenu";
import BottomBar from "@/sites/lulu/components/BottomBar";

export default function LuxeLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
    document.body.style.overflow = "";
  };

  const toggleMenu = (open: boolean) => {
    setMenuOpen(open);
    document.body.style.overflow = open ? "hidden" : "";
  };

  return (
    <>
      <Navbar menuOpen={menuOpen} setMenuOpen={toggleMenu} />
      <FullMenu open={menuOpen} onClose={closeMenu} />
      <main>{children}</main>
      <BottomBar />
    </>
  );
}
