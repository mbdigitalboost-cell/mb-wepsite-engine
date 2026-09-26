# turkey-locations.json

FAZ 2.6 (checkout wizard il/ilçe seçimi) — a compact `[{ id, name, districts: [{ id, name }] }]` array of Turkey's 81 provinces and 973 districts (il/ilçe), ~32 KB.

**Source:** derived from [onurusluca/turkey-geo-api](https://github.com/onurusluca/turkey-geo-api)'s `provinces.jsonl` + per-province `districts.jsonl` files (fetched 2026-09-26), MIT-licensed:

```
MIT License

Copyright (c) 2025 Onur Usluca

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Mahalle (neighborhood) is deliberately NOT included** — the same source's neighborhood-level data is ~16.7 MB raw across 73,496 rows, impractical to bundle for a checkout address field. Per this phase's own spec, mahalle is instead a required free-text input (`addressNeighborhood` in `lib/validation/order.ts`) rather than a third cascading dropdown level — a deliberate, explicitly-flagged trade-off, not a silently dropped feature.
