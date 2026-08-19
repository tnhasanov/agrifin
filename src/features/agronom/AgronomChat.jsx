import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { Aqronom } from "../../components/Aqronom.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { askAgronomist } from "../../services/agronom.js";
import { CROP_KEYS } from "../../services/crops.js";
import { DEFAULT_LOCATION } from "../../services/location.js";
import { sekliHazirla } from "../../lib/sekil.js";
import { hesabatSetirleri, paylas } from "../../services/paylas.js";
import { necheGunEvvel, ortukFaizi } from "../../services/ndvi.js";

const SAMPLE_KEYS = ["chat.sample.1", "chat.sample.2", "chat.sample.3", "chat.sample.4"];

/**
 * Xətanın səbəbini istifadəçiyə anlaşılan dildə çatdırır. Status kodu
 * brauzer konsoluna yazılır — quraşdırma zamanı səbəbi tapmaq üçün lazımdır,
 * amma fermerin ekranında HTTP kodu görünməməlidir.
 */
function errorKeyFor(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "chat.errorNetwork";
  }
  if (error?.status) {
    console.warn(`[agronom] /api/agronom → HTTP ${error.status}`);
  }
  switch (error?.status) {
    case 404:
      // Funksiya yayımda yoxdur — api/agronom.js kök qovluqda olmalıdır
      return "chat.errorNotDeployed";
    case 429:
      return "chat.errorBusy";
    case 500:
      // Server açarı görmür — mühit dəyişəni bu build-ə tətbiq olunmayıb
      return "chat.errorConfig";
    default:
      return "chat.errorServer";
  }
}

export function AgronomChat({
  onClose,
  // Peyk ölçməsi və müqayisə App-də bir dəfə qurulur (bax: App.jsx) — burada
  // yenidən soruşsaq eyni Copernicus sorğusu ikinci dəfə gedərdi
  peyk = { xulase: null },
  qonsu = { muqayise: null },
}) {
  const { t, lang } = useI18n();
  const { state, actions } = useStore();
  const location = state.location ?? DEFAULT_LOCATION;
  const { messages, crop, referral } = state.chat;
  const sahe = state.sahe;
  // Keşdən gəlir — əsas ekran onsuz da yükləyib

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Axın gedərkən yığılan mətn. Tamamlananda store-a bir dəfə yazılır —
  // hər parçada store-u yeniləsək, bütün tətbiq hər hərfdə render olunardı.
  const [axanMetn, setAxanMetn] = useState("");
  // Göndərilməmiş şəkil: {mediaType, data, dataUrl}
  const [sekil, setSekil] = useState(null);
  const [sekilXetasi, setSekilXetasi] = useState(null);
  const [paylasHali, setPaylasHali] = useState(null);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const faylRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, axanMetn]);

  // Sorğu YALNIZ komponent sökülərkən dayandırılır. Bunu Escape effekti ilə
  // birləşdirmək olmaz: onClose hər render-də yeni funksiyadır, ona görə o
  // effekt hər store yenilənməsində təmizlənir və uçuşdaki sorğunu kəsərdi.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const sekilSec = async (event) => {
    const fayl = event.target.files?.[0];
    // Eyni faylı təkrar seçmək mümkün olsun deyə giriş sıfırlanır
    event.target.value = "";
    if (!fayl) return;

    setSekilXetasi(null);
    try {
      setSekil(await sekliHazirla(fayl));
    } catch (error) {
      setSekilXetasi(error?.kod === "nov" ? "chat.photoBadType" : "chat.photoTooBig");
    }
  };

  /**
   * Hesabatı və son sualı aqronoma göndərir. Peyk rəqəmləri olmadan sual
   * yarımçıqdır: aqronom "sarı ləkə var" cümləsindən çox, "örtük 68%, su
   * kifayətdir, ölçmə 2 gün əvvəl" sətirlərindən nəticə çıxarır.
   */
  const aqronomaGonder = async () => {
    const sonSual = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const setirler = hesabatSetirleri({
      hektar: sahe?.hektar,
      bitkiKey: crop ? `kbcrop.${crop}` : null,
      faiz: ortukFaizi(peyk.xulase?.ndvi),
      medyanFaiz: ortukFaizi(qonsu.muqayise?.medyan),
      suSeviyyesi: peyk.xulase?.suSeviyyesi,
      gun: peyk.xulase?.tarix ? necheGunEvvel(peyk.xulase.tarix) : null,
    });
    const metn = [
      t("paylas.basliq"),
      ...setirler.map((setir) => t(setir.key, setir.vars)),
      sonSual ? `\n${t("paylas.sual")} ${sonSual}` : "",
      globalThis.location?.origin ?? "",
    ]
      .filter(Boolean)
      .join("\n");

    const netice = await paylas({ metn, basliq: t("paylas.basliq") });
    // Vərəq açılıbsa fermer artıq oradadır — yalnız görünməyən nəticə deyilir
    setPaylasHali(netice === "kopyalandi" || netice === "olmadi" ? netice : null);
  };

  const send = async (text) => {
    const question = (text ?? input).trim();
    // Şəkil varsa sual mətni məcburi deyil — "buna bax" kifayətdir
    if ((!question && !sekil) || busy) return;
    const sual = question || t("chat.photoOnly");

    // Xəta qabarcıqları söhbət tarixçəsi deyil — API-yə göndərilmir
    const history = [
      ...messages.filter((m) => !m.errorKey),
      { role: "user", content: sual },
    ];

    // Şəkil tarixçəyə YAZILMIR: base64 localStorage kvotasını bir neçə
    // şəkildə doldurar. Sualda göndərilir, modelin cavabı kontekstdə qalır.
    const gonderilenSekil = sekil;
    actions.chatUser(sual);
    setInput("");
    setSekil(null);
    setSekilXetasi(null);
    setBusy(true);
    setAxanMetn("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await askAgronomist({
        messages: history,
        bitkiKey: crop,
        location,
        sahe,
        ndvi: peyk.xulase,
        qonsu: qonsu.muqayise,
        sekil: gonderilenSekil,
        lang,
        signal: controller.signal,
        // Serverin "replace" hadisəsi mətni tam əvəz edə bilər (doza qoruyucusu),
        // ona görə parçanı əlavə etmirik — hər dəfə tam mətni alırıq.
        onDelta: (tamMetn) => {
          if (abortRef.current === controller) setAxanMetn(tamMetn);
        },
      });
      // Eyni render-də: axan mətn silinir, tam cavab tarixçəyə düşür — sıçrayış olmur
      actions.chatAssistant(result.answer, result.referral);
    } catch (error) {
      if (error?.name !== "AbortError") {
        actions.chatError(errorKeyFor(error));
      }
    } finally {
      setBusy(false);
      setAxanMetn("");
    }
  };

  const cropName = crop ? t(`kbcrop.${crop}`) : t("chat.noCrop");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("chat.title")}
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: C.mist, fontFamily: font.body }}
    >
      {/* Başlıq */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: C.pine }}>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("chat.back")}
          className="rounded-full p-1.5"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <Icon name="ChevronLeft" size={18} color="#fff" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white" style={{ fontFamily: font.display }}>
            {t("chat.title")}
          </h2>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            {location.name.replace(" (GPS)", "")} · {cropName}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={actions.chatClear}
            aria-label={t("chat.clear")}
            className="rounded-full p-1.5"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <Icon name="Trash2" size={15} color="rgba(255,255,255,0.8)" />
          </button>
        )}
        {/* Personaj başlıqda vəziyyəti daşıyır: fermer cavabın gəldiyini
            mətnə baxmadan, üzdən görür (bax: components/Aqronom.jsx) */}
        <Aqronom hal={axanMetn ? "danisir" : busy ? "dusunur" : "sakit"} olcu={34} />
      </div>

      {/* Bitki seçimi */}
      <div
        className="flex gap-2 overflow-x-auto px-3 py-2"
        style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.line}` }}
      >
        {CROP_KEYS.map((key) => {
          const selected = crop === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => actions.chatSetCrop(key)}
              aria-pressed={selected}
              className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: selected ? C.field : "#F1F4EF",
                color: selected ? "#fff" : C.muted,
              }}
            >
              {t(`kbcrop.${key}`)}
            </button>
          );
        })}
      </div>

      {/* Söhbət */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <>
            {/* İlk təəssürat: boş ekran əvvəl yalnız mətn qutusu idi.
                Personaj söhbətə "kimsə var" hissi verir — Leo-nun bank
                tətbiqində gördüyü işin eynisi. */}
            <div className="giris mb-3 flex items-end gap-2" style={{ "--i": 0 }}>
              <Aqronom hal="sakit" olcu={62} className="shrink-0" />
              <div
                className="mb-1 flex-1 rounded-2xl rounded-bl-sm p-3"
                style={{ backgroundColor: "#EAF4EC", border: "1px solid #CFE6D7" }}
              >
                <p className="text-xs font-bold" style={{ color: "#1C5733" }}>
                  {t("aqro.ad")}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "#256B41" }}>
                  {t("chat.intro")}
                </p>
              </div>
            </div>
            {SAMPLE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => send(t(key))}
                className="mb-2 w-full rounded-xl px-3 py-2.5 text-left text-xs font-medium"
                style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}
              >
                {t(key)}
              </button>
            ))}
          </>
        )}

        {messages.map((message, index) => {
          const isUser = message.role === "user";
          return (
            <div
              key={index}
              className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className="rounded-2xl px-3 py-2 text-xs leading-relaxed"
                style={{
                  maxWidth: "85%",
                  whiteSpace: "pre-wrap",
                  backgroundColor: isUser ? C.pine : C.card,
                  color: isUser ? "#fff" : message.errorKey ? C.danger : C.ink,
                  border: isUser ? "none" : `1px solid ${C.line}`,
                }}
              >
                {message.errorKey ? t(message.errorKey) : message.content}
              </div>
            </div>
          );
        })}

        {/* Axın gələnə qədər gözləmə göstəricisi, sonra mətnin özü */}
        {busy && (
          <div className="mb-3 flex justify-start">
            {axanMetn ? (
              <div
                aria-live="polite"
                className="rounded-2xl px-3 py-2 text-xs leading-relaxed"
                style={{
                  maxWidth: "85%",
                  whiteSpace: "pre-wrap",
                  backgroundColor: C.card,
                  color: C.ink,
                  border: `1px solid ${C.line}`,
                }}
              >
                {axanMetn}
                <span className="ml-0.5 animate-pulse" style={{ color: C.muted }}>
                  ▍
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-2"
                style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
              >
                {/* Donmuş spinner əvəzinə düşünən personaj: gözləmə vaxtı
                    ölü deyil, kimsə sualın üzərində işləyir */}
                <Aqronom hal="dusunur" olcu={26} />
                <span className="text-xs" style={{ color: C.muted }}>
                  {t("chat.thinking")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bu düymə əvvəl HEÇ NƏ etmirdi. İndi sahə hesabatını və son sualı
            telefonun paylaşma vərəqinə verir — aqronomla söhbət WhatsApp-da
            gedir, ora çatmayan məsləhət verilməmiş sayılır. */}
        {referral && !busy && (
          <button
            type="button"
            onClick={aqronomaGonder}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold"
            style={{ backgroundColor: C.gold, color: C.pine }}
          >
            <Icon name="UserCheck" size={14} color={C.pine} /> {t("chat.referral")}
          </button>
        )}
        {paylasHali && (
          <p className="mb-3 text-center text-xs" role="status" style={{ color: C.muted }}>
            {t(`paylas.${paylasHali}`)}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Giriş */}
      <div className="px-3 py-2" style={{ backgroundColor: C.card, borderTop: `1px solid ${C.line}` }}>
        {sekilXetasi && (
          <p role="alert" className="mb-1.5 flex items-center gap-1.5 text-xs" style={{ color: C.danger }}>
            <Icon name="AlertCircle" size={13} color={C.danger} /> {t(sekilXetasi)}
          </p>
        )}

        {sekil && (
          <div className="mb-2 flex items-center gap-2">
            <img
              src={sekil.dataUrl}
              alt={t("chat.photoPreview")}
              className="rounded-lg"
              style={{ width: 44, height: 44, objectFit: "cover" }}
            />
            <span className="flex-1 text-xs" style={{ color: C.muted }}>
              {t("chat.photoAttached")}
            </span>
            <button
              type="button"
              onClick={() => setSekil(null)}
              aria-label={t("chat.photoRemove")}
              className="rounded-full p-1.5"
              style={{ backgroundColor: "#F1F4EF" }}
            >
              <Icon name="X" size={14} color={C.muted} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* capture="environment" telefonda birbaşa arxa kameranı açır */}
          <input
            ref={faylRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={sekilSec}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => faylRef.current?.click()}
            aria-label={t("chat.photoAdd")}
            className="rounded-xl p-2.5"
            style={{ backgroundColor: "#F1F4EF" }}
          >
            <Icon name="Camera" size={16} color={C.pine} />
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
            className="flex-1 resize-none rounded-xl px-3 py-2 text-xs outline-none"
            style={{ backgroundColor: "#F4F7F2", color: C.ink, maxHeight: 90 }}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={busy || (!input.trim() && !sekil)}
            aria-label={t("chat.send")}
            className="rounded-xl p-2.5"
            style={{
              backgroundColor: C.pine,
              opacity: busy || (!input.trim() && !sekil) ? 0.45 : 1,
            }}
          >
            <Icon name="Send" size={15} color={C.gold} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-xs" style={{ color: C.muted, fontSize: 10 }}>
          {t("chat.disclaimer")}
        </p>
      </div>
    </div>
  );
}
