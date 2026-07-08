import { useState } from "react";
import * as L from "lucide-react";

// Təhlükəsiz ikon: adla tapır, tapılmasa nöqtə göstərir — heç vaxt çökmür.
const Ic = ({ n, size = 16, color = "currentColor", strokeWidth = 2 }) => {
  const Cmp = L[n];
  if (Cmp) return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" fill={color} />
    </svg>
  );
};

// ---------- Dizayn tokenləri ----------
const C = {
  pine: "#14351F",
  field: "#2E7D4F",
  gold: "#E9B54A",
  goldDeep: "#C9932B",
  blue: "#3E7BFA",
  mist: "#EFF2EC",
  card: "#FFFFFF",
  ink: "#1A211C",
  muted: "#6B7568",
  line: "#E3E8E0",
  danger: "#C24A3F",
};

const font = {
  display: "'Sora', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
};

const m = (n) => `${n.toLocaleString("de-DE")} ₼`; // 7.280 ₼ formatı

// ---------- Ortaq elementlər ----------
const Chip = ({ icon, label, color, bg }) => (
  <span
    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
    style={{ color, backgroundColor: bg, fontFamily: font.body }}
  >
    {icon && <Ic n={icon} size={12} strokeWidth={2.5} color={color} />}
    {label}
  </span>
);

const Card = ({ children, style, onClick }) => (
  <div
    onClick={onClick}
    className="rounded-2xl p-4"
    style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, ...style }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children, action, onAction }) => (
  <div className="flex items-center justify-between mt-5 mb-2 px-1">
    <h3
      className="text-sm font-bold tracking-wide"
      style={{ color: C.ink, fontFamily: font.display }}
    >
      {children}
    </h3>
    {action && (
      <button
        onClick={onAction}
        className="text-xs font-semibold"
        style={{ color: C.field }}
      >
        {action}
      </button>
    )}
  </div>
);

const Sparkline = ({ points, up }) => {
  const w = 72, h = 26;
  const min = Math.min(...points), max = Math.max(...points);
  const norm = points.map(
    (p, i) =>
      `${(i / (points.length - 1)) * w},${h - ((p - min) / (max - min || 1)) * (h - 4) - 2}`
  );
  return (
    <svg width={w} height={h}>
      <polyline
        points={norm.join(" ")}
        fill="none"
        stroke={up ? C.field : C.danger}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ---------- İmza elementi: FarmScore göstəricisi ----------
const FarmScoreGauge = ({ score, ndvi }) => {
  const pct = (score - 300) / (850 - 300);
  const r = 84, cx = 110, cy = 104;
  const start = Math.PI;
  const arc = (from, to, color, width, dash) => {
    const x1 = cx + r * Math.cos(from), y1 = cy - r * Math.sin(from);
    const x2 = cx + r * Math.cos(to), y2 = cy - r * Math.sin(to);
    const large = from - to > Math.PI ? 1 : 0;
    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    );
  };
  return (
    <svg width="220" height="120" viewBox="0 0 220 120">
      {arc(start, 0, "rgba(255,255,255,0.14)", 12)}
      {arc(start, start - pct * Math.PI, C.gold, 12)}
      {arc(start, start - ndvi * Math.PI, "rgba(96,190,134,0.9)", 3, "2 6")}
      <text
        x={cx} y={cy - 18} textAnchor="middle" fill="#FFFFFF"
        fontFamily={font.display} fontSize="34" fontWeight="800"
      >
        {score}
      </text>
      <text
        x={cx} y={cy + 2} textAnchor="middle" fill="rgba(255,255,255,0.75)"
        fontFamily={font.body} fontSize="10" fontWeight="600" letterSpacing="0.12em"
      >
        FARMSCORE
      </text>
    </svg>
  );
};

// ---------- Ekranlar ----------
const HomeScreen = ({ go, wallet, recs, openLoan }) => (
  <div className="px-4 pb-4">
    <div
      className="rounded-3xl pt-4 pb-3 px-4 mt-3"
      style={{ background: `linear-gradient(160deg, ${C.pine} 0%, #0E2818 70%)` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
            Sabahınız xeyir, Samir
          </p>
          <p className="text-sm font-bold text-white" style={{ fontFamily: font.display }}>
            Yaşıl Vadi Təsərrüfatı · 6.5 ha
          </p>
        </div>
        <Chip icon="Satellite" label="Bu gün təsdiqlənib" color="#BFE8CF" bg="rgba(96,190,134,0.18)" />
      </div>

      <div className="flex justify-center -mb-1">
        <FarmScoreGauge score={782} ndvi={0.72} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-1">
        <div className="rounded-xl px-2 py-2" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>Məhsul sağlamlığı</p>
          <p className="text-sm font-bold text-white">
            NDVI 0.72 <span style={{ color: "#7FD6A4" }}>▲</span>
          </p>
        </div>
        <div className="rounded-xl px-2 py-2" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>Kredit limiti</p>
          <p className="text-sm font-bold" style={{ color: C.gold }}>{m(12000)}</p>
        </div>
        <div className="rounded-xl px-2 py-2" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>Pulqabı</p>
          <p className="text-sm font-bold text-white">{m(wallet)}</p>
        </div>
      </div>

      <button
        onClick={openLoan}
        className="w-full mt-3 rounded-xl py-3 text-sm font-bold"
        style={{ backgroundColor: C.gold, color: C.pine, fontFamily: font.display }}
      >
        Məhsul dövrü krediti al
      </button>
      <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
        Peyklə təsdiqlənmiş əkininiz sizin kredit tarixçənizdir.
      </p>
    </div>

    <SectionTitle action="7 gün">Sahədə hava</SectionTitle>
    <Card style={{ padding: "12px" }}>
      <div className="flex justify-between">
        {[
          { d: "C.ax", i: "Sun", t: "31°" },
          { d: "Cümə", i: "CloudRain", t: "24°", wet: true },
          { d: "Şən", i: "CloudRain", t: "23°", wet: true },
          { d: "Baz", i: "Sun", t: "28°" },
          { d: "B.e", i: "Wind", t: "27°" },
        ].map((w) => (
          <div key={w.d} className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold" style={{ color: C.muted }}>{w.d}</span>
            <Ic n={w.i} size={18} color={w.wet ? C.blue : C.goldDeep} />
            <span className="text-xs font-bold" style={{ color: C.ink }}>{w.t}</span>
          </div>
        ))}
      </div>
      <div
        className="mt-3 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2"
        style={{ backgroundColor: "#EAF1FD", color: "#2C5BC7" }}
      >
        <Ic n="Droplets" size={14} color="#2C5BC7" /> Cümə–şənbə 34 mm yağış gözlənilir. Məsləhətçi planınızı yenilədi.
      </div>
    </Card>

    <SectionTitle action="Məsləhətçini aç" onAction={() => go("advisor")}>Bugünkü addımlar</SectionTitle>
    {recs.filter((r) => !r.done).slice(0, 2).map((r) => (
      <Card key={r.id} style={{ marginBottom: 8 }} onClick={() => go("advisor")}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl p-2" style={{ backgroundColor: r.bg }}>
            <Ic n={r.icon} size={16} color={r.color} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{r.title}</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{r.source}</p>
          </div>
          <Ic n="ChevronRight" size={16} color={C.muted} />
        </div>
      </Card>
    ))}
  </div>
);

const AdvisorScreen = ({ recs, completeRec }) => (
  <div className="px-4 pb-4">
    <SectionTitle>Tövsiyələr</SectionTitle>
    <p className="text-xs px-1 -mt-1 mb-3" style={{ color: C.muted }}>
      Məhsuldarlığa və gəlirinizə təsirinə görə sıralanıb. Mənbə hər kartda göstərilir.
    </p>
    {recs.map((r) => (
      <Card key={r.id} style={{ marginBottom: 10, opacity: r.done ? 0.55 : 1 }}>
        <div className="flex items-start gap-3">
          <div className="rounded-xl p-2 mt-0.5" style={{ backgroundColor: r.bg }}>
            <Ic n={r.icon} size={16} color={r.color} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
                {r.title}
              </p>
              {r.impact && <Chip label={r.impact} color={C.goldDeep} bg="#FBF1DA" />}
            </div>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: C.muted }}>{r.body}</p>
            <div className="flex items-center justify-between mt-3">
              <Chip icon={r.icon} label={r.source} color={r.color} bg={r.bg} />
              {r.done ? (
                <span className="text-xs font-bold flex items-center gap-1" style={{ color: C.field }}>
                  <Ic n="Check" size={14} color={C.field} /> Hazırdır
                </span>
              ) : (
                <button
                  onClick={() => completeRec(r.id)}
                  className="text-xs font-bold rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: C.pine, color: "#fff" }}
                >
                  {r.cta}
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    ))}
  </div>
);

const MoneyScreen = ({ wallet, txns, loan, openLoan }) => (
  <div className="px-4 pb-4">
    <div
      className="rounded-3xl p-4 mt-3 relative overflow-hidden"
      style={{ background: `linear-gradient(150deg, ${C.pine}, #1E4A2E 60%, #2E7D4F)` }}
    >
      <div className="flex justify-between items-start">
        <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.8)", letterSpacing: "0.15em" }}>
          AGRIFIN · DEBET
        </p>
        <Ic n="Leaf" size={18} color={C.gold} />
      </div>
      <p className="text-2xl font-extrabold text-white mt-4" style={{ fontFamily: font.display }}>
        {m(wallet)}
      </p>
      <div className="flex justify-between items-end mt-4">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "0.2em" }}>
          •••• 4127
        </p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>SAMİR ƏLİYEV</p>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 mt-3">
      {[
        { l: "Göndər", i: "ArrowUpRight" },
        { l: "Artır", i: "ArrowDownLeft" },
        { l: "Kart", i: "CreditCard" },
      ].map((a) => (
        <button
          key={a.l}
          className="rounded-xl py-3 flex flex-col items-center gap-1"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
        >
          <Ic n={a.i} size={16} color={C.pine} />
          <span className="text-xs font-semibold" style={{ color: C.ink }}>{a.l}</span>
        </button>
      ))}
    </div>

    <SectionTitle>Maliyyələşmə</SectionTitle>
    {loan.active && (
      <Card style={{ marginBottom: 8 }}>
        <div className="flex justify-between items-center">
          <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            Məhsul krediti
          </p>
          <Chip icon="Calendar" label="Ödəniş: 15 avq" color={C.goldDeep} bg="#FBF1DA" />
        </div>
        <p className="text-xs mt-1" style={{ color: C.muted }}>
          {m(loan.amount)} götürülüb · biçində bir ödənişlə {m(loan.repay)}
        </p>
        <div className="h-2 rounded-full mt-3" style={{ backgroundColor: C.mist }}>
          <div className="h-2 rounded-full" style={{ width: "62%", backgroundColor: C.field }} />
        </div>
        <p className="text-xs mt-1" style={{ color: C.muted }}>Mövsümün 62%-i tamamlanıb</p>
      </Card>
    )}
    <Card style={{ marginBottom: 8 }} onClick={openLoan}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2" style={{ backgroundColor: "#FBF1DA" }}>
          <Ic n="Zap" size={16} color={C.goldDeep} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: C.ink }}>Resurs krediti (indi al, sonra ödə)</p>
          <p className="text-xs" style={{ color: C.muted }}>Toxum və gübrəni indi al, biçindən sonra ödə</p>
        </div>
        <Ic n="ChevronRight" size={16} color={C.muted} />
      </div>
    </Card>
    <Card>
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2" style={{ backgroundColor: "#E9F5EE" }}>
          <Ic n="ShieldCheck" size={16} color={C.field} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: C.ink }}>Quraqlıq sığortası · Aktivdir</p>
          <p className="text-xs" style={{ color: C.muted }}>
            Peyk quraqlıq stresi aşkarlayanda ödəniş avtomatik köçürülür
          </p>
        </div>
        <Chip label="Parametrik" color={C.field} bg="#E9F5EE" />
      </div>
    </Card>

    <SectionTitle>Son əməliyyatlar</SectionTitle>
    <Card style={{ padding: "6px 16px" }}>
      {txns.map((t, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-3"
          style={{ borderBottom: i < txns.length - 1 ? `1px solid ${C.line}` : "none" }}
        >
          <div className="rounded-full p-2" style={{ backgroundColor: t.amt > 0 ? "#E9F5EE" : C.mist }}>
            <Ic n={t.amt > 0 ? "ArrowDownLeft" : "ArrowUpRight"} size={14} color={t.amt > 0 ? C.field : C.muted} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{t.name}</p>
            <p className="text-xs" style={{ color: C.muted }}>{t.meta}</p>
          </div>
          <p className="text-sm font-bold" style={{ color: t.amt > 0 ? C.field : C.ink }}>
            {t.amt > 0 ? "+" : "−"}{m(Math.abs(t.amt))}
          </p>
        </div>
      ))}
    </Card>
  </div>
);

const MarketScreen = () => {
  const rows = [
    { crop: "Buğda", price: 360, unit: "/t", chg: "+2.4%", up: true, pts: [320, 326, 323, 336, 347, 342, 360] },
    { crop: "Alma", price: 1090, unit: "/t", chg: "+0.8%", up: true, pts: [1037, 1046, 1057, 1051, 1071, 1078, 1090] },
    { crop: "Arpa", price: 300, unit: "/t", chg: "−1.1%", up: false, pts: [313, 310, 311, 306, 303, 304, 300] },
  ];
  return (
    <div className="px-4 pb-4">
      <SectionTitle>Məhsul qiymətləriniz</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {rows.map((r, i) => (
          <div
            key={r.crop}
            className="flex items-center gap-3 py-3"
            style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : "none" }}
          >
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>{r.crop}</p>
              <p className="text-xs font-semibold" style={{ color: r.up ? C.field : C.danger }}>bu həftə {r.chg}</p>
            </div>
            <Sparkline points={r.pts} up={r.up} />
            <p className="text-sm font-bold w-20 text-right" style={{ color: C.ink }}>
              {r.price} ₼
              <span className="text-xs font-medium" style={{ color: C.muted }}>{r.unit}</span>
            </p>
          </div>
        ))}
      </Card>

      <SectionTitle>Satış pəncərəsi proqnozu</SectionTitle>
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Ic n="TrendingUp" size={16} color={C.field} />
          <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            Buğda: ən yaxşı dövr 20 iyul – 3 avqust
          </p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          İyulun ortasından sonra regional təklif azalır. Model bugünkü qiymətdən +6–9% artım gözləyir.
          Forvard müqaviləsi ilə qiyməti erkən sabitləyin.
        </p>
        <button
          className="w-full mt-3 rounded-xl py-2.5 text-sm font-bold"
          style={{ backgroundColor: C.pine, color: "#fff" }}
        >
          Forvard müqaviləsi yarat
        </button>
      </Card>

      <SectionTitle>Yaxınlıqdakı alıcı təklifləri</SectionTitle>
      {[
        { b: "Şirvan Taxıl MMC", d: "12 km · daşınma daxildir", p: "370 ₼/t", v: "Təsdiqlənmiş alıcı" },
        { b: "Xəzər Qida MMC", d: "28 km · 24 saata ödəyir", p: "365 ₼/t", v: "Eskrou qorumalı" },
      ].map((o) => (
        <Card key={o.b} style={{ marginBottom: 8 }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ backgroundColor: C.mist }}>
              <Ic n="MapPin" size={16} color={C.pine} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>{o.b}</p>
              <p className="text-xs" style={{ color: C.muted }}>{o.d} · {o.v}</p>
            </div>
            <p className="text-sm font-bold" style={{ color: C.field }}>{o.p}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

const CarbonScreen = ({ creditsSold, sellCredits }) => (
  <div className="px-4 pb-4">
    <div
      className="rounded-3xl p-4 mt-3"
      style={{ background: `linear-gradient(150deg, #123A24, ${C.field})` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.75)", letterSpacing: "0.15em" }}>
          BU MÖVSÜM KARBON
        </p>
        <Chip icon="Satellite" label="MRV təsdiqli" color="#BFE8CF" bg="rgba(255,255,255,0.14)" />
      </div>
      <p className="text-3xl font-extrabold text-white mt-3" style={{ fontFamily: font.display }}>
        12.4 <span className="text-base font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>tCO₂e tutulub</span>
      </p>
      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
        Peyk və qeyd etdiyiniz təcrübələr əsasında ölçülüb. Kağız işi yoxdur.
      </p>
    </div>

    <SectionTitle>Karbondan qazanın</SectionTitle>
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            9 təsdiqlənmiş kredit hazırdır
          </p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Bazar qiyməti 40 ₼ / kredit · cəmi 360 ₼</p>
        </div>
        {creditsSold ? (
          <span className="text-xs font-bold flex items-center gap-1" style={{ color: C.field }}>
            <Ic n="Check" size={14} color={C.field} /> Satıldı
          </span>
        ) : (
          <button
            onClick={sellCredits}
            className="text-xs font-bold rounded-lg px-3 py-2"
            style={{ backgroundColor: C.gold, color: C.pine }}
          >
            360 ₼-a sat
          </button>
        )}
      </div>
      <p className="text-xs mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: C.mist, color: C.muted }}>
        Kredit satışı FarmScore balınızı da yaxşılaşdırır — davamlı təsərrüfatlar krediti daha yaxşı qaytarır.
      </p>
    </Card>

    <SectionTitle>Təcrübələr</SectionTitle>
    <Card style={{ padding: "6px 16px" }}>
      {[
        { p: "Şimal sahəsində örtük bitkiləri", s: "Peyklə təsdiqlənib", ok: true },
        { p: "Şumsuz əkin", s: "Peyklə təsdiqlənib", ok: true },
        { p: "Azaldılmış azot istifadəsi", s: "Təsdiq üçün gübrə qəbzini yükləyin", ok: false },
      ].map((r, i) => (
        <div
          key={r.p}
          className="flex items-center gap-3 py-3"
          style={{ borderBottom: i < 2 ? `1px solid ${C.line}` : "none" }}
        >
          <div className="rounded-full p-1.5" style={{ backgroundColor: r.ok ? "#E9F5EE" : C.mist }}>
            <Ic n={r.ok ? "Check" : "Info"} size={13} color={r.ok ? C.field : C.muted} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: C.ink }}>{r.p}</p>
            <p className="text-xs" style={{ color: C.muted }}>{r.s}</p>
          </div>
          {!r.ok && (
            <button
              className="text-xs font-bold rounded-lg px-2.5 py-1.5"
              style={{ border: `1px solid ${C.line}`, color: C.pine }}
            >
              Təsdiqlə
            </button>
          )}
        </div>
      ))}
    </Card>

    <SectionTitle>ESG hesabatı</SectionTitle>
    <Card>
      <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
        Alıcılar və kreditorlarla təsdiqlənmiş davamlılıq hesabatı paylaşın — ESG hesabatı olan
        təsərrüfatlar ixrac alıcılarından daha yaxşı qiymət və maliyyələşmədə daha aşağı faiz alır.
      </p>
      <button
        className="w-full mt-3 rounded-xl py-2.5 text-sm font-bold"
        style={{ backgroundColor: C.pine, color: "#fff" }}
      >
        Hesabat yarat
      </button>
    </Card>
  </div>
);

// ---------- Kredit axını ----------
const LoanModal = ({ close, confirm }) => {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(5000);
  const rate = 11.5;
  const repay = Math.round(amount * (1 + (rate / 100) * (5 / 12)));
  return (
    <div
      className="absolute inset-0 flex items-end justify-center z-30"
      style={{ backgroundColor: "rgba(10,20,14,0.55)" }}
    >
      <div className="w-full rounded-t-3xl p-5 pb-6" style={{ backgroundColor: C.card }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-extrabold" style={{ color: C.ink, fontFamily: font.display }}>
            {step === 2 ? "Vəsait köçürüldü" : "Məhsul dövrü krediti"}
          </h3>
          <button onClick={close} className="rounded-full p-1.5" style={{ backgroundColor: C.mist }}>
            <Ic n="X" size={16} color={C.ink} />
          </button>
        </div>

        {step === 0 && (
          <div>
            <p className="text-xs mb-4" style={{ color: C.muted }}>
              782 FarmScore balınız illik {rate}% faizlə {m(12000)}-a qədər kredit açır.
              Bir ödəniş — buğda biçininizə uyğunlaşdırılıb.
            </p>
            <p className="text-3xl font-extrabold text-center mb-2" style={{ color: C.ink, fontFamily: font.display }}>
              {m(amount)}
            </p>
            <input
              type="range"
              min="1000"
              max="12000"
              step="500"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: C.field }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: C.muted }}>
              <span>{m(1000)}</span>
              <span>{m(12000)}</span>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full mt-5 rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.pine, color: "#fff" }}
            >
              Şərtlərə bax
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            {[
              ["Pulqabına köçürülür", "Bu gün, dərhal"],
              ["Bir ödəniş", `15 avqustda (biçin) ${m(repay)}`],
              ["Faiz (FarmScore 782)", `İllik ${rate}% — regional ortalamadan 3% aşağı`],
              ["Girov", "Yoxdur. Peyklə təsdiqlənmiş əkininiz kifayətdir."],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-3 py-2.5"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <span className="text-xs" style={{ color: C.muted }}>{k}</span>
                <span className="text-xs font-bold text-right" style={{ color: C.ink }}>{v}</span>
              </div>
            ))}
            <button
              onClick={() => {
                setStep(2);
                confirm(amount);
              }}
              className="w-full mt-5 rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.gold, color: C.pine }}
            >
              Qəbul et və {m(amount)} al
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-4">
            <div className="mx-auto rounded-full p-4 mb-3 inline-block" style={{ backgroundColor: "#E9F5EE" }}>
              <Ic n="Check" size={28} color={C.field} />
            </div>
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {m(amount)} pulqabınızdadır
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>
              15 avqustda {m(repay)} ödəyin. Taxıl satılanda sizə xatırladacağıq.
            </p>
            <button
              onClick={close}
              className="w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.pine, color: "#fff" }}
            >
              Bağla
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Tətbiq çərçivəsi ----------
export default function AgriFinApp() {
  const [tab, setTab] = useState("home");
  const [wallet, setWallet] = useState(7280);
  const [creditsSold, setCreditsSold] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [loan] = useState({ active: true, amount: 8000, repay: 8380 });
  const [toast, setToast] = useState(null);
  const [txns, setTxns] = useState([
    { name: "Şirvan Taxıl MMC", meta: "Buğda satışı · eskrou açıldı", amt: 3150 },
    { name: "AqroTəchizat", meta: "Gübrə · kart ••4127", amt: -530 },
    { name: "Yanacaq məntəqəsi", meta: "Dizel · kart ••4127", amt: -160 },
    { name: "Quraqlıq sığortası", meta: "Aylıq haqq", amt: -70 },
  ]);
  const [recs, setRecs] = useState([
    {
      id: 1,
      title: "Şimal sahəsi, 3-cü zonanı suvarın",
      cta: "Planlaşdır",
      body: "Peyk göstərir ki, 3-cü zonada NDVI 6 gündə 0.09 azalıb — erkən su stressi. 48 saat ərzində suvarma təxminən 0.4 t/ha məhsulu qoruyur.",
      source: "Peyk · Sentinel-2, dünən",
      icon: "Satellite",
      color: C.blue,
      bg: "#EAF1FD",
      impact: "təx. +310 ₼",
    },
    {
      id: 2,
      title: "Gübrələməni bazar gününə saxlayın",
      cta: "Planı dəyiş",
      body: "Cümə–şənbə 34 mm yağış yağacaq. Yağışdan əvvəl azot vermək axıntı deməkdir — pul itkisi və karbon balınıza zərbə. Bazar günü şərait idealdır.",
      source: "Hava · yerli stansiya + model",
      icon: "CloudRain",
      color: "#2C5BC7",
      bg: "#EAF1FD",
      impact: "210 ₼ qənaət",
    },
    {
      id: 3,
      title: "Buğda üçün satış pəncərəsi açılır",
      cta: "Təkliflərə bax",
      body: "Qiymətlər bu həftə 2.4% artıb, model iyulun sonuna qədər +6–9% gözləyir. Zirvəni sabitləmək üçün məhsulun bir hissəsinə forvard müqaviləsi düşünün.",
      source: "Bazar · qiymət proqnozu",
      icon: "TrendingUp",
      color: C.field,
      bg: "#E9F5EE",
      impact: "+6–9%",
    },
    {
      id: 4,
      title: "Mənənə riski artır",
      cta: "Baxışı qeyd et",
      body: "Bu həftəki rütubət və temperatur bölgənizdə mənənə yayılması şəraitinə uyğundur. Bağın kənarlarını yoxlayın; erkən müdaxilə gecikmişdən qat-qat ucuzdur.",
      source: "Aqronomiya · zərərverici modeli",
      icon: "Sprout",
      color: C.goldDeep,
      bg: "#FBF1DA",
      impact: null,
    },
  ]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const completeRec = (id) => {
    setRecs(recs.map((r) => (r.id === id ? { ...r, done: true } : r)));
    showToast("Təsərrüfat planınıza əlavə olundu");
  };

  const sellCredits = () => {
    setCreditsSold(true);
    setWallet((w) => w + 360);
    setTxns((t) => [{ name: "Karbon kreditləri", meta: "9 kredit satıldı · təsdiqlənib", amt: 360 }, ...t]);
    showToast("360 ₼ pulqabınıza əlavə olundu");
  };

  const confirmLoan = (amount) => {
    setWallet((w) => w + amount);
    setTxns((t) => [{ name: "Məhsul krediti", meta: "Dərhal köçürüldü", amt: amount }, ...t]);
  };

  const tabs = [
    { id: "home", label: "Əsas", icon: "Home" },
    { id: "advisor", label: "Məsləhət", icon: "Sprout" },
    { id: "money", label: "Pul", icon: "Wallet" },
    { id: "market", label: "Bazar", icon: "BarChart3" },
    { id: "carbon", label: "Karbon", icon: "Leaf" },
  ];

  return (
    <div
      className="az-outer min-h-screen w-full flex items-center justify-center py-6"
      style={{ backgroundColor: "#DFE5DB", fontFamily: font.body }}
    >
      <style>
        {"@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');" +
          ".az-frame{max-width:402px;height:min(860px,94vh);border-radius:36px;box-shadow:0 24px 60px rgba(16,32,22,0.35);}" +
          "@media (max-width:640px){.az-outer{padding:0!important;}.az-frame{max-width:100%;height:100vh;height:100dvh;border-radius:0;box-shadow:none;}}"}
      </style>

      <div
        className="az-frame relative w-full flex flex-col overflow-hidden"
        style={{ backgroundColor: C.mist }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl p-1.5" style={{ backgroundColor: C.pine }}>
              <Ic n="Leaf" size={14} color={C.gold} />
            </div>
            <span className="text-sm font-extrabold" style={{ color: C.pine, fontFamily: font.display }}>
              AgriFin
            </span>
          </div>
          <button
            className="relative rounded-full p-2"
            style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
          >
            <Ic n="Bell" size={15} color={C.ink} />
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: C.danger }}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "home" && (
            <HomeScreen go={setTab} wallet={wallet} recs={recs} openLoan={() => setLoanOpen(true)} />
          )}
          {tab === "advisor" && <AdvisorScreen recs={recs} completeRec={completeRec} />}
          {tab === "money" && (
            <MoneyScreen wallet={wallet} txns={txns} loan={loan} openLoan={() => setLoanOpen(true)} />
          )}
          {tab === "market" && <MarketScreen />}
          {tab === "carbon" && <CarbonScreen creditsSold={creditsSold} sellCredits={sellCredits} />}
        </div>

        {toast && (
          <div className="absolute left-0 right-0 flex justify-center z-40" style={{ bottom: 92 }}>
            <div
              className="rounded-full px-4 py-2 text-xs font-bold flex items-center gap-2"
              style={{ backgroundColor: C.pine, color: "#fff", boxShadow: "0 8px 24px rgba(16,32,22,0.3)" }}
            >
              <Ic n="Check" size={13} color={C.gold} /> {toast}
            </div>
          </div>
        )}

        <div
          className="flex justify-around items-center px-2 pt-2 pb-4"
          style={{ backgroundColor: C.card, borderTop: `1px solid ${C.line}` }}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl"
                style={{ backgroundColor: active ? C.mist : "transparent" }}
              >
                <Ic n={t.icon} size={18} color={active ? C.pine : "#9AA79B"} strokeWidth={active ? 2.4 : 2} />
                <span className="text-xs font-semibold" style={{ color: active ? C.pine : "#9AA79B" }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {loanOpen && <LoanModal close={() => setLoanOpen(false)} confirm={confirmLoan} />}
      </div>
    </div>
  );
}
