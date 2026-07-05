"use client";

import { useEffect, useState } from "react";

interface MeResponse {
  authenticated: boolean;
  role: string;
  permissions: string[];
  restaurantId: number | null;
  subscriptionStatus: string | null;
  roleLabel: string;
}

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.success ? d.data : null))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const hasPermission = (perm: string) => {
    if (!me) return false;
    if (me.role === "super_admin" || me.role === "admin") return true;
    return me.permissions.includes(perm);
  };

  return { me, loading, hasPermission };
}
