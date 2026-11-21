"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

/**
 * FAZ 1 (mağaza sepeti/configurator) — fully client-side cart, no backend.
 * No cart/order DB tables exist yet (see the roadmap referenced in the
 * task that introduced this), so this is plain localStorage state, keyed
 * PER STORE SLUG (`mb-store-cart:${storeSlug}`) — every /store/[storeSlug]
 * route used to share one Vercel origin, so an unscoped key would bleed
 * one store's cart into another store's cart in the same browser. Since
 * Faz 28/29 every store has its own Vercel project and domain
 * (lib/sites/registry.ts), but the key stays scoped as defense in depth. This key scoping is what prevents
 * that, not a security boundary (there is no server-side auth here at
 * all — this is anonymous, ephemeral, single-browser state).
 *
 * Every display field (name/image/variant+addon labels) is snapshotted
 * into the CartItem at add-time rather than re-fetched from the DB —
 * deliberate for Faz 1: the cart page renders purely from localStorage,
 * no new server queries. Faz 2 (real orders) will re-resolve everything
 * server-side from ids anyway (see lib/commerce/pricing.ts's own Faz 2
 * note) — snapshotted display strings here are never trusted as a price
 * source for that later step, only ids are (productId/variantId/addonIds).
 *
 * IMPLEMENTATION — useSyncExternalStore, not useState+useEffect: cart
 * state lives OUTSIDE React (localStorage), so it's read/subscribed the
 * way React itself recommends for any external mutable store (this is
 * the textbook "sync with an external store" case, not "state that
 * happens to need an effect"). CartStore below owns the real array +
 * notifies subscribers on every mutation; components never call
 * setState for it directly.
 */

export interface CartItem {
  /** Stable per-line id — a hash of productId+variantId+sorted addonIds, so re-adding the exact same configuration increments quantity instead of creating a duplicate line. */
  lineId: string;
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl: string | null;
  variantId: string | null;
  /** e.g. "Renk: Siyah, Beden: L" — null when the product has no variant selection. */
  variantLabel: string | null;
  addonIds: string[];
  /** e.g. ["Yan Cep (+100,00 TL)"] — parallel to addonIds, display only. */
  addonLabels: string[];
  /** Unit price AT THE TIME OF ADDING (base + addon deltas) — snapshotted, not re-derived live, so a later price change in the dashboard doesn't retroactively alter an item already in the cart. */
  unitPrice: number;
  quantity: number;
}

type Listener = () => void;

const EMPTY_ITEMS: CartItem[] = [];

function storageKey(storeSlug: string): string {
  return `mb-store-cart:${storeSlug}`;
}

function readCart(storeSlug: string): CartItem[] {
  try {
    const raw = window.localStorage.getItem(storageKey(storeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt/foreign JSON, private-mode storage block, etc. — never let a
    // bad localStorage value break the page; start from an empty cart.
    return [];
  }
}

function writeCart(storeSlug: string, items: CartItem[]): void {
  try {
    window.localStorage.setItem(storageKey(storeSlug), JSON.stringify(items));
  } catch {
    // Storage full/blocked (private mode, quota) — the in-memory store
    // still works for this tab session, it just won't persist across
    // reloads. Not surfaced as an error; a cart is a convenience here,
    // not a critical transaction (Faz 1 has no checkout yet).
  }
}

/**
 * One instance per storeSlug (cached in `stores` below), so every
 * component calling useCart() for the same store shares the exact same
 * live array/subscriber list — a write from the header badge is
 * immediately visible on the cart page without any prop drilling.
 */
class CartStore {
  private items: CartItem[] = EMPTY_ITEMS;
  private hydrated = false;
  private listeners = new Set<Listener>();

  constructor(private readonly storeSlug: string) {}

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Lazily hydrates from localStorage on the FIRST real (browser) read,
   * then returns the same array reference until the next mutation —
   * useSyncExternalStore requires a stable reference when nothing
   * changed, or it re-renders in a loop.
   */
  getSnapshot = (): CartItem[] => {
    if (!this.hydrated) {
      this.items = readCart(this.storeSlug);
      this.hydrated = true;
    }
    return this.items;
  };

  getServerSnapshot = (): CartItem[] => EMPTY_ITEMS;

  private commit(items: CartItem[]): void {
    this.items = items;
    this.hydrated = true;
    writeCart(this.storeSlug, items);
    this.listeners.forEach((listener) => listener());
  }

  addItem(item: Omit<CartItem, "quantity">, quantity: number): void {
    const current = this.getSnapshot();
    const existing = current.find((i) => i.lineId === item.lineId);
    const next = existing
      ? current.map((i) => (i.lineId === item.lineId ? { ...i, quantity: i.quantity + quantity } : i))
      : [...current, { ...item, quantity }];
    this.commit(next);
  }

  removeItem(lineId: string): void {
    this.commit(this.getSnapshot().filter((i) => i.lineId !== lineId));
  }

  setQuantity(lineId: string, quantity: number): void {
    const current = this.getSnapshot();
    const next =
      quantity <= 0
        ? current.filter((i) => i.lineId !== lineId)
        : current.map((i) => (i.lineId === lineId ? { ...i, quantity } : i));
    this.commit(next);
  }

  clear(): void {
    this.commit([]);
  }

  /** Faz 34 — sunucudaki güncel fiyatları uygula, artık satılamayan satırları çıkar (lib/commerce/cart-refresh.ts). */
  applyServerRefresh(priceByLineId: Map<string, number>, removeLineIds: Set<string>): void {
    if (priceByLineId.size === 0 && removeLineIds.size === 0) return;
    const next = this.getSnapshot()
      .filter((i) => !removeLineIds.has(i.lineId))
      .map((i) => (priceByLineId.has(i.lineId) ? { ...i, unitPrice: priceByLineId.get(i.lineId)! } : i));
    this.commit(next);
  }
}

const stores = new Map<string, CartStore>();

function getStore(storeSlug: string): CartStore {
  let store = stores.get(storeSlug);
  if (!store) {
    store = new CartStore(storeSlug);
    stores.set(storeSlug, store);
  }
  return store;
}

const CartStoreContext = createContext<CartStore | null>(null);

export function CartProvider({ storeSlug, children }: { storeSlug: string; children: ReactNode }) {
  const store = useMemo(() => getStore(storeSlug), [storeSlug]);
  return <CartStoreContext.Provider value={store}>{children}</CartStoreContext.Provider>;
}

export function makeCartLineId(productId: string, variantId: string | null, addonIds: string[]): string {
  const sortedAddonIds = [...addonIds].sort();
  return [productId, variantId ?? "-", ...sortedAddonIds].join("|");
}

export function useCart() {
  const store = useContext(CartStoreContext);
  if (!store) throw new Error("useCart must be used within a CartProvider");

  const items = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  // Faz 34 — eylemler yalnız store'a bağlı (sabit kimlik): efekt bağımlılıklarında
  // her sepet değişikliğinde yeniden tetiklenmesinler.
  const actions = useMemo(
    () => ({
      addItem: (item: Omit<CartItem, "quantity">, quantity: number) => store.addItem(item, quantity),
      removeItem: (lineId: string) => store.removeItem(lineId),
      setQuantity: (lineId: string, quantity: number) => store.setQuantity(lineId, quantity),
      clear: () => store.clear(),
      applyServerRefresh: (priceByLineId: Map<string, number>, removeLineIds: Set<string>) => store.applyServerRefresh(priceByLineId, removeLineIds),
    }),
    [store],
  );

  return useMemo(
    () => ({
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      ...actions,
    }),
    [items, actions],
  );
}
