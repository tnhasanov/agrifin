import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { askAgronomist } from "../../services/agronom.js";
import { CROP_KEYS } from "../../services/crops.js";
import { DEFAULT_LOCATION } from "../../services/location.js";

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

export function AgronomChat({ onClose }) {
  const { t, lang } = useI18n();
  const { state, actions } = useStore();
  const location = state.location ?? DEFAULT_LOCATION;
  const { messages, crop, referral } = state.chat;

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

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

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;

    // Xəta qabarcıqları söhbət tarixçəsi deyil — API-yə göndərilmir
    const history = [
      ...messages.filter((m) => !m.errorKey),
      { role: "user", content: question },
    ];

    actions.chatUser(question);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await askAgronomist({
        messages: history,
        bitkiKey: crop,
        location,
        lang,
        signal: controller.signal,
      });
      actions.chatAssistant(result.answer, result.referral);
    } catch (error) {
      if (error?.name !== "AbortError") {
        actions.chatError(errorKeyFor(error));
      }
    } finally {
      setBusy(false);
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
        <Icon name="Sprout" size={20} color={C.gold} />
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
            <div
              className="mb-3 rounded-2xl p-3"
              style={{ backgroundColor: "#EAF4EC", border: "1px solid #CFE6D7" }}
            >
              <p className="text-xs leading-relaxed" style={{ color: "#256B41" }}>
                {t("chat.intro")}
              </p>
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

        {busy && (
          <div className="mb-3 flex justify-start">
            <div
              className="flex items-center gap-2 rounded-2xl px-3 py-2"
              style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
            >
              <Icon name="LoaderCircle" size={13} color={C.muted} />
              <span className="text-xs" style={{ color: C.muted }}>
                {t("chat.thinking")}
              </span>
            </div>
          </div>
        )}

        {referral && !busy && (
          <button
            type="button"
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold"
            style={{ backgroundColor: C.gold, color: C.pine }}
          >
            <Icon name="UserCheck" size={14} color={C.pine} /> {t("chat.referral")}
          </button>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Giriş */}
      <div className="px-3 py-2" style={{ backgroundColor: C.card, borderTop: `1px solid ${C.line}` }}>
        <div className="flex items-end gap-2">
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
            disabled={busy || !input.trim()}
            aria-label={t("chat.send")}
            className="rounded-xl p-2.5"
            style={{ backgroundColor: C.pine, opacity: busy || !input.trim() ? 0.45 : 1 }}
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
