import { PALETTE_CSS } from "@/config";

/**
 * 기록자 이름 입력. 한글 IME 입력이 필요해서 캔버스가 아닌 DOM 으로 띄운다.
 * 취소(Esc)하면 null.
 */
export function askName(defaultName: string): Promise<string | null> {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.style.cssText = `
      position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(8,8,11,.85); z-index:10; font-family:"Noto Serif KR",serif; color:${PALETTE_CSS.bone};
    `;
    wrap.innerHTML = `
      <div style="text-align:center; display:flex; flex-direction:column; gap:18px; align-items:center;">
        <div style="font-family:'Space Mono',monospace; font-size:12px; color:${PALETTE_CSS.mute}; letter-spacing:.2em;">RECORDER</div>
        <div style="font-size:20px;">기록자의 이름은?</div>
        <input id="se-name" maxlength="12" autocomplete="off" style="
          background:transparent; border:0; border-bottom:1px solid ${PALETTE_CSS.bone}; color:${PALETTE_CSS.bone};
          font-family:inherit; font-size:26px; text-align:center; width:260px; padding:6px 0; outline:none;" />
        <div style="display:flex; gap:28px; font-size:16px;">
          <button id="se-ok" style="background:none;border:0;color:${PALETTE_CSS.bone};font-family:inherit;font-size:16px;cursor:pointer;">시작</button>
          <button id="se-cancel" style="background:none;border:0;color:${PALETTE_CSS.mute};font-family:inherit;font-size:16px;cursor:pointer;">취소</button>
        </div>
        <div style="font-family:'Space Mono',monospace; font-size:11px; color:${PALETTE_CSS.mute};">비우면 '노아'</div>
      </div>`;
    document.body.appendChild(wrap);

    const input = wrap.querySelector<HTMLInputElement>("#se-name")!;
    input.value = defaultName;
    input.focus();
    input.select();

    const finish = (v: string | null) => {
      wrap.remove();
      resolve(v);
    };
    const ok = () => finish(input.value.trim() || "노아");
    wrap.querySelector("#se-ok")!.addEventListener("click", ok);
    wrap.querySelector("#se-cancel")!.addEventListener("click", () => finish(null));
    input.addEventListener("keydown", (e) => {
      if (e.isComposing) return;
      if (e.key === "Enter") ok();
      if (e.key === "Escape") finish(null);
      e.stopPropagation();
    });
    for (const btn of Array.from(wrap.querySelectorAll("button"))) {
      btn.addEventListener("mouseenter", () => (btn.style.color = PALETTE_CSS.baelzRed));
      btn.addEventListener("mouseleave", () => (btn.style.color = btn.id === "se-ok" ? PALETTE_CSS.bone : PALETTE_CSS.mute));
    }
  });
}
