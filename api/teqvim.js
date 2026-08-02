// api/teqvim.js — bitkinin bu aykı mərhələsi və işləri.
//
// Bilik bazası (23 kB) serverdə qalır; buradan yalnız bir bitkinin bir aylıq
// hissəsi (~1 kB) çıxır. Məzmun sirr deyil, amma bütün bazanı hər telefona
// göndərməyin mənası yoxdur.
//
// Açar tələb olunmur — Copernicus və ya Anthropic çağırılmır, ona görə bu
// endpoint peyk kvotasına toxunmur.
import { teqvimQur } from "../lib/teqvim.js";
import { ipTap, suretHeddiYarat } from "../lib/copernicus.js";

const suretHeddiKecilib = suretHeddiYarat({ pencereMs: 10 * 60 * 1000, hedd: 60 });

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Yalnız GET" });
  }
  if (suretHeddiKecilib(ipTap(req))) {
    return res.status(429).json({ error: "Çox sorğu göndərildi. Bir az sonra yoxlayın." });
  }

  const bitki = String(req.query?.bitki ?? "");
  const ay = Number(req.query?.ay);

  const teqvim = teqvimQur(bitki, ay);
  if (!teqvim) {
    return res.status(400).json({ error: "Bitki və ya ay yanlışdır." });
  }

  // Məzmun ayda bir dəfə dəyişir — CDN-də saxlanmasına icazə veririk
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return res.status(200).json({ teqvim });
}
