'use client';
import { useState, useEffect } from 'react';

export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar-collapsed') === 'true');
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return [collapsed, toggle];
}
