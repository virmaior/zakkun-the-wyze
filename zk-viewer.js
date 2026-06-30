/* zk-viewer — manifest-driven replacement for the screensHH.html pages.
 *
 * One static page for every (date, cam, hour). All data comes from
 *   /cgi-bin/zk.cgi?a=manifest&d=YYYYMMDD&cam=N&h=HH
 * which merges every configured *source* (sd / rtsp) for that hour. The
 * viewer lets you flip the displayed source without reloading, mark ranges,
 * and POST them back as JSON; the server writes the legacy tmp/*.tmp so
 * za-harau.sh keeps working.
 *
 * State that must survive page navigation (in-progress selections across
 * cams/hours) lives in localStorage under "zkday", kept separate from the
 * old "zaday" key so the two viewers do not corrupt each other.
 */

const STATES = ["za_nothing", "za_start", "za_end"];
const LS_KEY = "zkday";

const qs = new URLSearchParams(location.search);
const Q = {
  d: qs.get("d"),
  cam: qs.get("cam") || "1",
  h: (qs.get("h") || "00").padStart(2, "0"),
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const App = {
  openImage : false,
  manifest: null,
  source: null,          // currently displayed source id
  imgGap: 15,
  histCount: 4,
  diffs: [],             // [{mm, idx, dsize, region}]
  clipIt(x) {
    if (navigator.clipboard) { navigator.clipboard.writeText(x); }
    else { 
        const ta = document.createElement('textarea');
        ta.value = x;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');   
        document.body.removeChild(ta);
    }
  },
  hourKey() { return `${Q.d}:${Q.h}:${Q.cam}`; },

  // ----- localStorage ----------------------------------------------------
  loadAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
    catch { return {}; }
  },
  saveAll(obj) { localStorage.setItem(LS_KEY, JSON.stringify(obj)); },
  saveHour(ranges) {
    const all = this.loadAll();
    if (ranges.length) all[this.hourKey()] = ranges;
    else delete all[this.hourKey()];
    this.saveAll(all);
  },

  // ----- bootstrap -------------------------------------------------------
  async init() {
    this.zkBar = $("#zk_bar");

    if (!Q.d) { $("#zk_title").textContent = "missing ?d=YYYYMMDD"; return; }
    const r = await fetch(`/cgi-bin/zk.cgi?a=manifest&d=${Q.d}&cam=${Q.cam}&h=${Q.h}`);
    const j = await r.json();
    if (!j.ok) { $("#zk_title").textContent = j.error || "manifest error"; return; }
    this.manifest = j.manifest;
    this.source = this.manifest.source_order.find(s => this.manifest.sources[s].present)
               || this.manifest.source_order[0];
    this.imgGap = Math.floor(60 / (this.manifest.capture.caps_per_minute || 4));

    this.renderHead();
    this.renderRows();
    this.renderBar();
    this.renderRanges();
    this.bind();
    this.restoreSelf();
    this.observeRows();
    if (this.manifest.scores) this.applyServerScores(this.manifest.scores);
  },

  applyServerScores(sc) {
    // shape from zk/score.py: {maxd, per_minute:{mm:dsize}, top:[{mm,idx,region,dsize}]}
    $("#zk_bar").style.setProperty("--maxd", sc.maxd || 1);
    this.diffs = sc.shots;
    this.applyDiff();
    this.msg(`motion: server (${sc.source})`, "ok");
  },

  // ----- header ----------------------------------------------------------
  renderHead() {
    const m = this.manifest;
    const zkt = $("#zk_title");
    zkt.innerHTML = `<div class="zktDate">${m.date}</div><div class="zktCam">Cam ${m.cam}</div><div class="zktHour">${m.hour}h</div>`;
    zkt.setAttribute('cam',m.cam);
    $("#zk_sources").innerHTML = m.source_order.map(id => {
      const s = m.sources[id];
      const dis = s.present ? "" : "disabled";
      const chk = id === this.source ? "checked" : "";
      return `<div class="zkSrc" value="${id}" ${chk} ${dis}>
              ${s.label}</div>`;
    }).join("");
    // nav buttons
    const n = m.neighbors;
    const map = { prev_hour: n.prev_hour, next_hour: n.next_hour,
                  prev_cam: n.prev_cam, next_cam: n.next_cam };
    $$("#zk_nav button").forEach(b => {
      const nav = b.dataset.nav;
      if (nav == 'new_hour') {
        b.disabled = false; 
        return; 
      }

      const v = map[nav];
      
      b.disabled = (v === null || v === undefined);
      b.dataset.target = v ?? "";
    });
  },

  // ----- minute rows -----------------------------------------------------
  renderRows() {
    const m = this.manifest;
    const srcInfo = m.sources[this.source];
    const rows = m.minutes.map(min => {
      const mm = min.minute;
      const badges = m.source_order.map(id => {
        const has = min.sources[id]?.video;
        return `<span class="${has ? "src_ok" : "src_miss"}">${id}</span>`;
      }).join("");
      const cur = min.sources[this.source] || {};
      const videoHref = cur.video && srcInfo.hour_dir
        ? `/${srcInfo.hour_dir}/${mm}.mp4` : null;
      const minLink = videoHref
        ? `<a href="${videoHref}" target="_blank">${mm}</a>` : mm;
      const shots = (cur.screens || []).map((fn, i) => {
        const url = `/${srcInfo.hour_dir}/${fn}`;
        return `<div class="zk_shot" data-mm="${mm}" data-idx="${i + 1}">
                  <img loading="lazy" src="${url}" data-mm="${mm}" data-idx="${i + 1}">
                  <span class="zk_png">PNG</span>
                </div>`;
      }).join("");
      return `<div class="zk_row za_nothing" data-mm="${mm}">
                <div class="zk_marker">
                  <div class="minLink">${minLink}</div>
                  <div class="src_badges">${badges}</div>
                  <div class="zk_other" data-mm="${mm}"></div>
                </div>
                <div class="zk_shots">${shots}</div>
              </div>`;
    }).join("");
    $("#zk_rows").innerHTML = rows;
    this.imgs = $$('.zk_shot > IMG');
    this.imagesLeft = this.imgs.length;
    this.imagesTotal = this.imagesLeft;
    this.imagesDone = 0;
    if (this.imagesLeft > 0) {  
      this.zkBar.classList.add('loading'); 
    }
    this.imgs.forEach( r => {
      r.loading = "eager"; 
      r.complete ? this.imgDone()
        :  r.addEventListener("load", () => { this.imgDone(); } , { once: true }),
           r.addEventListener("error", () => { this.imgDone(); } , { once: true });
      r.addEventListener('mouseover',(e) => {
        const t= e.currentTarget;
        const shot = t.closest(".zk_shot");
        const rect = t.getBoundingClientRect();
        if (this.openImage) {
          this.openImage.dispatchEvent(new CustomEvent('mouseleave'));
        }
        const y = copyImage(t);
        const z = document.createElement('div');
        z.classList.add('openImage');
        z.innerHTML =  '<span class="zk_png">PNG</span>';
        z.append(y);
        document.body.append(z);

        z.style.top =  rect.top + window.scrollY + 'px';
        let desiredLeft = rect.left + window.scrollX;
        if ((desiredLeft + y.offsetWidth) > window.innerWidth) {
          desiredLeft = window.innerWidth - y.offsetWidth;
        }

        z.style.left = desiredLeft + 'px';
        this.openImage = z;
        z.addEventListener('click',(e2) => {
            e2.currentTarget.click();
            if (this.openImage) {
              this.openImage.dispatchEvent(new CustomEvent('mouseleave'));
            }
        });
        z.addEventListener('mouseleave',(e2) => {
            z.remove();
            this.openImage = false;
        });
        z.querySelector('.zk_png').addEventListener('click',(e3)=> {
              const png = e3.currentTarget;  
              e3.stopPropagation();
              e3.preventDefault();
              this.clipIt(this.pngCmd(shot.dataset.mm, +shot.dataset.idx));
              return;
        }); 
    }); });
  },

  // ----- timeline bar ----------------------------------------------------
  renderBar() {
    const hists = '<div class="hist"></div>'.repeat(this.histCount);
    const mMin = this.manifest.minutes.map( min => min.minute);

    const cells = [...Array(60).keys()].map(min => {
      const minF = min.toString().padStart(2,"0");
      let iClass = "za_missing"
      if (mMin.includes(minF)) { 
          iClass = 'za_nothing';
      } 
      return `<div class="zk_cell ${iClass}" data-mm="${minF}">
        ${hists}</span><span class="mm">${minF}</span>
       </div>` }).join("");
    $("#zk_bar").innerHTML = cells;
  },

  // ----- cross-cam range strip ------------------------------------------
  renderRanges() {
    const all = this.loadAll();
    const rows = [];
    for (const [key, ranges] of Object.entries(all)) {
      const [d, h, cam] = key.split(":");
      if (d !== Q.d || h !== Q.h) continue;
      const segs = ranges.map(r => {
        const span = (r.end - r.start + 1);
        return `<div class="zk_range_seg camColor" cam="${cam}" style="grid-column:${+r.start + 1}/span ${span}"
                 title="${r.label || ""}">${r.label || ""}</div>`;
      }).join("");
      
      rows.push(`<div class="zk_range_row" style="order:${this.manifest.orders[cam]}" cam="${cam}">${segs}</div>`);
      if (cam !== Q.cam) {
        ranges.forEach(r => this.paintOther(r, cam));
      }
    }
    $("#zk_ranges").innerHTML = rows.join("");
    $("#zk_cmd").textContent = this.legacyCmd(all);
  },

  paintOther(r, cam) {
    for (let i = r.start; i <= r.end; i++) {
      const mm = String(i).padStart(2, "0");
      const el = $(`.zk_other[data-mm="${mm}"]`);
      if (el) {
        el.querySelector(`.otherLabel[cam="${cam}"]`)?.remove();

         el.insertAdjacentHTML("beforeend",
        `<div class="camColor otherLabel" cam="${cam}">${r.label || ""}</div>`);
      }
    }
  },

  legacyCmd(all) {
    const flat = [];
    for (const ranges of Object.values(all)) flat.push(...ranges);
    if (!flat.length) return "";
    return `sudo zsh za-horu.sh i="${encodeLegacy(flat)}"`;
  },

  // ----- selection state machine ----------------------------------------
  setState(mm, cls) {
    [`.zk_row[data-mm="${mm}"]`, `.zk_cell[data-mm="${mm}"]`].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      el.classList.remove(...STATES,['za_single']);
      if (cls === 'za_single') {
        el.classList.add(...['za_start','za_end','za_single']);
      } else { 
        el.classList.add(cls);
      }
    });
    const marker = $(`.zk_row[data-mm="${mm}"] .zk_marker`);
    marker.querySelectorAll(".zk_label_wrap").forEach(e => e.remove());
    if ((cls === "za_start") || (cls === 'za_single')) {
      const prev = marker.dataset.label || "";
      marker.insertAdjacentHTML("beforeend",
        `<div class="zk_label_wrap">
           <input class="zk_label_in" value="${prev}">
           <span class="zk_shift">
             <button data-dir="-1">↑</button><button data-dir="1">↓</button>
           </span>
         </div>`);
    } else if (cls === "za_end") {
      marker.insertAdjacentHTML("beforeend",
        `<div class="zk_label_wrap"><span class="zk_shift">
           <button data-dir="-1">↑</button><button data-dir="1">↓</button>
         </span></div>`);
    }   },

  /**
   * 
   * @param {minute} mm 
   * @returns {string} ['za_single','za_start','za_end','za_nothing']
   */
  stateOf(mm) {
    const el = $(`.zk_row[data-mm="${mm}"]`);
    if (el) {
      if (el.classList.contains('za_single')) { return 'za_single'; }
    }
    return STATES.find(s => el?.classList.contains(s)) || "za_nothing";
  },

  /**
   * this function figures out what the prior state was restrospectively across the data. 
   * i.e. if it's 05 right now, should we make this a za_start or za_end ?
   * if there is a za_start then return that so we can build a segment ; if there was most recently a za_end, then it's time to be a za_start
   * @param {number} mm 
   * @returns {string}
   */
  priorState(mm) {
    for (let i = +mm - 1; i >= 0; i--) {
      const s = this.stateOf(String(i).padStart(2, "0"));
      if (s === "za_start" || s === "za_end") return s;
    }
    return "za_end";
  },
  /**
   * this saves the label for a start item
   * @param {number} mm 
   */
  saveLabel(mm)
  {
      const inp = $(`.zk_row[data-mm="${mm}"] .zk_label_in`);
      if (inp) $(`.zk_row[data-mm="${mm}"] .zk_marker`).dataset.label = inp.value;
  },
    /**
   * this retrieves a label
   * @param {number} mm 
   * @returns {string}
   */
  getLabel(mm) 
  {
    return $(`.zk_row[data-mm="${mm}"] .zk_label_in`)?.value ||  $(`.zk_row[data-mm="${mm}"] .zk_marker`)?.dataset.label || "";
  },
  /**
   * this toggles back and forth
   * @param {numbe} mm 
   */
  toggle(mm) {
    const cur = this.stateOf(mm);
    if (cur === "za_start") {
          this.saveLabel(mm);
  }
    let idx = STATES.indexOf(cur);
    let next = STATES[(idx + 1) % STATES.length];
    if (next === this.priorState(mm)) next = STATES[(idx + 2) % STATES.length];
    this.setState(mm, next);
  },

  /**
   * this uses the up/down to shift
   * @param {number} mm 
   * @param {number} dir 
   */
  shift(mm, dir) {
    const mins = this.manifest.minutes.map(m => m.minute);
    const i = mins.indexOf(mm);
    const dest = mins[i + dir];
    if (!dest) return;
    const cls = this.stateOf(mm);
    const marker = $(`.zk_row[data-mm="${mm}"] .zk_marker`);
    const label = this.getLabel(mm);
    this.setState(mm, "za_nothing");
    $(`.zk_row[data-mm="${dest}"] .zk_marker`).dataset.label = label;
    if ( (this.stateOf(dest) === 'za_start') && (cls === 'za_end') ) 
    {
        this.saveLabel(dest);
        this.setState(dest, 'za_single');
        return;
    }
    this.setState(dest, cls);
  },

  collect() {
    const out = [];
    let open = null;
    for (const m of this.manifest.minutes) {
      const mm = m.minute;
      const s = this.stateOf(mm);
      if (s === 'za_single') {
          const lbl =  this.getLabel(mm);
          out.push({ date: Q.d, hour: Q.h, cam: Q.cam, source: this.source,
                        start: +mm, end: +mm, label: "" });
      }
      else if (s === "za_start") {
        if (open) out.push(open);
        const lbl =  this.getLabel(mm);
        open = { date: Q.d, hour: Q.h, cam: Q.cam, source: this.source,
                 start: +mm, end: +mm, label: lbl };
      } else if (s === "za_end") {
        if (open) { open.end = +mm; out.push(open); open = null; }
        else out.push({ date: Q.d, hour: Q.h, cam: Q.cam, source: this.source,
                        start: +mm, end: +mm, label: "" });
      }
    }
    if (open) { open.end = 59; out.push(open); }
    // merge adjacent with same label
    const merged = [];
    for (const r of out) {
      const last = merged[merged.length - 1];
      if (last && r.start === last.end + 1 && r.label === last.label) last.end = r.end;
      else merged.push(r);
    }
    return merged;
  },

  restoreSelf() {
    const mine = this.loadAll()[this.hourKey()] || [];
    for (const r of mine) {
      const s = String(r.start).padStart(2, "0");
      const e = String(r.end).padStart(2, "0");
      $(`.zk_row[data-mm="${s}"] .zk_marker`).dataset.label = r.label || "";
      this.setState(s, "za_start");
      if (r.end > r.start) this.setState(e, "za_end");
    }
  },

  // ----- actions ---------------------------------------------------------
  generate() {
    const ranges = this.collect();
    if (!ranges.length) { this.msg("no ranges marked", "err"); return null; }
    this.saveHour(ranges);
    this.renderRanges();
    this.msg(`saved ${ranges.length} range(s)`, "ok");
    return ranges;
  },

  async send() {
    const all = this.loadAll();
    const flat = [];
    for (const ranges of Object.values(all)) flat.push(...ranges);
    if (!flat.length) { this.msg("nothing to send", "err"); return; }
    const r = await fetch("/cgi-bin/zk.cgi?a=submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ranges: flat }),
    });
    const j = await r.json();
    if (j.ok) this.msg(`queued → ${j.tmp_file}`, "ok");
    else this.msg(j.error || "submit failed", "err");
  },

  msg(t, cls) { const m = $("#zk_msg"); m.textContent = t; m.className = cls || ""; },

  /**
   * this generates a PNG command
   * @param {number} mm 
   * @param {number} idx 
   * @returns {string}
   */
  pngCmd(mm, idx) {
    const sec = (idx - 1) * this.imgGap;
    const sep = this.manifest.sources[this.source].sep;
    return `sudo zsh za-png.sh d=${Q.d} cam=${Q.cam} h=${Q.h} ` +
           `min=${mm} sec=${sec} spt=${sep}`;
  },

  // ----- bindings --------------------------------------------------------
  bind() {
    $$(".zkSrc").forEach(src=> src.addEventListener("click", e => {
        const t = e.target;
        this.source = t.getAttribute('value');
        t.setAttribute('checked',1);
        t.setAttribute('disabled',1);
        t.parentElement.querySelectorAll('.zkSrc').forEach(srz => {
            if (srz.getAttribute('value') !== this.source) {
                srz.removeAttribute('checked');
                srz.removeAttribute('disabled');
            }
        });
        const keep = this.collect();           // preserve marks across re-render
        this.renderRows();
        keep.forEach(r => {
          const s = String(r.start).padStart(2, "0");
          const e2 = String(r.end).padStart(2, "0");
          $(`.zk_row[data-mm="${s}"] .zk_marker`).dataset.label = r.label || "";
          this.setState(s, "za_start");
          if (r.end > r.start) this.setState(e2, "za_end");
        });
        this.renderRanges();
        this.observeRows();
        this.diffs = [];
    }));

    $("#zk_rows").addEventListener("click", e => {
      const minLink = e.target.closest('.minLink');
      if (minLink) {
          e.stopPropagation();
          return;
      }
      const png = e.target.closest(".zk_png");
      if (png) {
        e.stopPropagation();
        const shot = png.closest(".zk_shot");
        this.clipIt(
          this.pngCmd(shot.dataset.mm, +shot.dataset.idx));
        this.msg("png cmd copied", "ok");
        return;
      }
      const sh = e.target.closest(".zk_shift button");
      if (sh) {
        e.stopPropagation();
        const mm = sh.closest(".zk_row").dataset.mm;
        this.shift(mm, +sh.dataset.dir);
        return;
      }
      if (e.target.closest(".zk_label_in")) return;
      const row = e.target.closest(".zk_marker, .zk_shot");
      if (row) this.toggle(row.closest(".zk_row").dataset.mm);
    });

    $("#zk_bar").addEventListener("click", e => {
      const c = e.target.closest(".zk_cell");
      if (!c) return;
      $(`.zk_row[data-mm="${c.dataset.mm}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#zk_nav").addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b || b.disabled) return;
      this.generate();
      const nav_it = b.dataset.nav;
      const p = new URLSearchParams(location.search);

      if (nav_it === 'new_hour') {
          const thour = $('#zk_nav BUTTON[data-nav="next_hour"]').dataset.target.padStart(2,"0");
          p.set('h',thour);
          if (thour == '00') { 
             const cd = new Date(p.get('d').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
             cd.setDate(cd.getDate() + 1);
             p.set('d',cd.toISOString().slice(0,10).replace(/-/g,"")); 
          }
          p.set("cam", 1)
      } else {
        const t = b.dataset.target;
        if (b.dataset.nav.endsWith("cam")) p.set("cam", t);
        else p.set("h", String(t).padStart(2, "0"));
      }
      location.search = p.toString();
    });

    $("#zk_generate").onclick = () => this.generate();
    $("#zk_send").onclick = () => { this.generate(); this.send(); };
    $("#zk_clear1").onclick = () => {
      this.saveHour([]);
      this.manifest.minutes.forEach(m => this.setState(m.minute, "za_nothing"));
      this.renderRanges();
    };
    $("#zk_clearall").onclick = () => { this.saveAll({}); location.reload(); };
    $("#zk_copy").onclick = () => {
      this.clipIt($("#zk_cmd").textContent);
      this.msg("command copied", "ok");
    };
  },

  observeRows() {
    this._obs?.disconnect();
    this._obs = new IntersectionObserver(entries => {
      for (const en of entries) {
        const mm = en.target.dataset.mm;
        $(`.zk_cell[data-mm="${mm}"]`)
          ?.classList.toggle("inview", en.isIntersecting);
      }
    }, { threshold: 0.1 });
    $$(".zk_row").forEach(r => this._obs.observe(r));
  },
  imgDone()
  {
      const percent = Math.round(++this.imagesDone / this.imagesTotal * 100);
      this.zkBar.style.setProperty('--progress', `${percent}%`);
      this.zkBar.setAttribute('progress',percent);
      if (--this.imagesLeft === 0)  {
        this.zkBar.classList.remove('loading'); 
        if (!this.manifest.scores) this.runDiff(this.imgs); 
      }
  },
  isMostlyOneColor(ctx, W, H, threshold = 0.82) {
    const data = ctx.getImageData(0, 0, W, H).data;
    
    const firstR = data[0];
    const firstG = data[1];
    const firstB = data[2];
    
    let sameCount = 0;
    const total = W * H;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i] === firstR && 
            data[i+1] === firstG && 
            data[i+2] === firstB) {
            sameCount++;
        }
    }

    return (sameCount / total) >= threshold;
},
  runDiff(imgs) {
    const W = 192, H = 108;
    const cv = [0, 1].map(() => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      return c.getContext("2d", { willReadFrequently: true });
    });
    const heat = loadHeat(Q.cam, W * H);
    const ninth = buildNinth(W, H);
    let run = 0;
    const out = [];
    for (const img of imgs) {
      if (!img.naturalWidth) continue;
      const ctx = cv[run % 2];
      ctx.drawImage(img, 0, 0, W, H);
      quantise(ctx, W, H);
      if (this.isMostlyOneColor(ctx,W,H)) { 
        console.log('empty image');
        continue; 
      }
      run++;
      if (run === 1) continue;

      const a = cv[0].getImageData(0, 0, W, H).data;
      const b = cv[1].getImageData(0, 0, W, H).data;
      const d = compare(a, b, heat, ninth);
      d.mm = img.dataset.mm; d.idx = img.dataset.idx;
      out.push(d);
    }
    this.diffs = out;
    this.applyDiff();
  },

  applyDiff() {
    if (!this.diffs.length) return;
    const perMin = {};
    let max1 = 0, max2 = 0;
    let a= 0;
    let curMin =  false;
    let hists = false;
    for (const d of this.diffs) {
        a++;
        if (d.mm !== curMin ) {
          curMin = d.mm;
          a =0;
          hists = $$(`.zk_cell[data-mm="${curMin}"] .hist`);
        }
      hists[a]?.style.setProperty("--d", d.dsize);
      perMin[d.mm] = Math.max(perMin[d.mm] || 0, d.dsize);
      if (d.dsize > max1) { max2 = max1; max1 = d.dsize; }
      else if (d.dsize > max2) max2 = d.dsize;
    }
    $("#zk_bar").style.setProperty("--maxd", max2 || max1 || 1);
    // top-10 motion overlays
    [...this.diffs].sort((a, b) => b.dsize - a.dsize).slice(0, 10).forEach(d => {
      const el = $(`.zk_shot[data-mm="${d.mm}"][data-idx="${d.idx}"]`);
      if (el) { el.classList.add("motion"); el.dataset.reg = d.region; }
    });
  },
};

// ---- pure helpers (kept outside App so they're easy to move server-side) ---

function encodeLegacy(ranges) {
  // Mirror of zk/legacy.py — kept client-side only for the "Copy cmd" button.
  const groups = new Map();
  for (const r of ranges) {
    const k = `${String(r.hour).padStart(2, "0")}|${r.cam}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const seg = r => {
    const lbl = (r.label || "blank").replaceAll(" ", "_").replace(/[;,>:V]/g, "-");
    return `d:${r.date};h:${String(r.hour).padStart(2, "0")};c:${r.cam};` +
           `s:${String(r.start).padStart(2, "0")};e:${String(r.end).padStart(2, "0")};l:${lbl}`;
  };
  let out = "";
  for (const [k, segs] of groups) {
    const [hh, cam] = k.split("|");
    out += `h:${hh};c:${cam}>` + segs.map(seg).join(",") + "V";
  }
  return out;
}

function loadHeat(cam, total) {
  try {
    const j = JSON.parse(localStorage.getItem("camMap" + cam) || "null");
    if (j && Array.isArray(j.data) && j.data.length === total) return j.data;
  } catch { /* ignore */ }
  return null; // null → modifier of 100 everywhere
}

function buildNinth(W, H) {
  const m = new Array(W * H);
  const pw = W / 3, ph = H / 3;
  for (let y = 0; y < H; y++) {
    const v = y > 2 * ph ? "b" : y > ph ? "m" : "t";
    for (let x = 0; x < W; x++) {
      const h = x > 2 * pw ? "r" : x > pw ? "c" : "l";
      m[y * W + x] = v + h;
    }
  }
  return m;
}

function quantise(ctx, W, H) {
  const d = ctx.getImageData(0, 0, W, H);
  const a = d.data, step = 255 / 8;
  for (let i = 0; i < a.length; i += 4) {
    a[i]     = Math.floor(a[i]     / step) * step;
    a[i + 1] = Math.floor(a[i + 1] / step) * step;
    a[i + 2] = Math.floor(a[i + 2] / step) * step;
  }
  ctx.putImageData(d, 0, 0);
}

function compare(a, b, heat, ninth) {
  let dsize = 0;
  const reg = { tl:0,tc:0,tr:0, ml:0,mc:0,mr:0, bl:0,bc:0,br:0 };
  for (let i = 0; i < a.length; i += 4) {
    const raw = Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]);
    const w = heat ? heat[i >> 2] : 100;
    const ds = raw * w;
    if (ds > 1000) { // ~ sensitivity 10 * weight 100
      dsize += ds;
      reg[ninth[i >> 2]] += ds;
    }
  }
  let best = "mc", bv = -1;
  for (const k in reg) if (reg[k] > bv) { bv = reg[k]; best = k; }
  return { dsize, region: best };
}


function copyImage(imgElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgElement.naturalWidth || imgElement.width;
  canvas.height = imgElement.naturalHeight || imgElement.height;
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/png'); // or 'image/jpeg', 'image/webp'

  const newImg = document.createElement('img');
  newImg.src = dataUrl;
  return newImg; 
}

document.addEventListener("DOMContentLoaded", () => App.init());