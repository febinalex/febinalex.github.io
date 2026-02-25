(function () {
  const TAGS = {
    0x0100: "ImageWidth", 0x0101: "ImageHeight", 0x010F: "Make", 0x0110: "Model",
    0x0112: "Orientation", 0x011A: "XResolution", 0x011B: "YResolution", 0x0128: "ResolutionUnit",
    0x0131: "Software", 0x0132: "ModifyDate", 0x013B: "Artist", 0x8298: "Copyright",
    0x829A: "ExposureTime", 0x829D: "FNumber", 0x8822: "ExposureProgram", 0x8827: "ISO",
    0x9000: "ExifVersion", 0x9003: "DateTimeOriginal", 0x9004: "CreateDate",
    0x9201: "ShutterSpeedValue", 0x9202: "ApertureValue", 0x9204: "ExposureBiasValue",
    0x9207: "MeteringMode", 0x9209: "Flash", 0x920A: "FocalLength",
    0xA001: "ColorSpace", 0xA002: "PixelXDimension", 0xA003: "PixelYDimension",
    0xA405: "FocalLengthIn35mmFilm", 0xA431: "SerialNumber", 0xA434: "LensModel",
    0x0001: "GPSLatitudeRef", 0x0002: "GPSLatitude", 0x0003: "GPSLongitudeRef",
    0x0004: "GPSLongitude", 0x0005: "GPSAltitudeRef", 0x0006: "GPSAltitude",
    0x0007: "GPSTimeStamp", 0x001D: "GPSDateStamp"
  };

  const CATEGORIES = {
    "File Information": ["ImageWidth", "ImageHeight", "PixelXDimension", "PixelYDimension"],
    "Camera Settings": ["Make", "Model", "LensModel", "ExposureTime", "FNumber", "ISO", "FocalLength", "FocalLengthIn35mmFilm", "Flash", "MeteringMode"],
    "Date & Time": ["DateTimeOriginal", "CreateDate", "ModifyDate"],
    "GPS Data": ["GPSLatitudeRef", "GPSLatitude", "GPSLongitudeRef", "GPSLongitude", "GPSAltitude", "GPSDateStamp", "GPSTimeStamp", "GPSDecimal"],
    "Software & Processing": ["Software", "ColorSpace", "ExifVersion", "Orientation", "XResolution", "YResolution", "ResolutionUnit"],
    "Other Data": []
  };

  const dropzone = document.getElementById("dropzone");
  const input = document.getElementById("fileInput");
  const results = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const expandAllBtn = document.getElementById("expandAll");
  const collapseAllBtn = document.getElementById("collapseAll");
  const cardTpl = document.getElementById("cardTpl");
  const sectionTpl = document.getElementById("sectionTpl");
  const pageBody = document.body;

  function setLayoutState(hasResults) {
    pageBody.classList.toggle("has-results", Boolean(hasResults));
  }

  function addRow(grid, k, v) {
    const kEl = document.createElement("div");
    const vEl = document.createElement("div");
    kEl.className = "k";
    vEl.className = "v";
    kEl.textContent = k;
    vEl.textContent = v;
    grid.append(kEl, vEl);
  }

  function bytesToAscii(dv, start, len) {
    let s = "";
    for (let i = 0; i < len; i++) {
      const c = dv.getUint8(start + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  }

  function safeDiv(n, d) {
    if (!d) return "0";
    const x = n / d;
    return String(Number.isFinite(x) ? Number(x.toFixed(6)) : 0);
  }

  function parseTiff(dv, base) {
    if (base + 8 > dv.byteLength) return {};
    const endian = dv.getUint16(base);
    const little = endian === 0x4949;
    if (!(little || endian === 0x4d4d)) return {};

    const u16 = (o) => dv.getUint16(o, little);
    const u32 = (o) => dv.getUint32(o, little);
    const i32 = (o) => dv.getInt32(o, little);
    if (u16(base + 2) !== 42) return {};

    const out = {};
    const ifd0 = base + u32(base + 4);

    function readVal(type, count, valuePtr) {
      const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
      const unit = sizes[type] || 1;
      const total = unit * count;
      const ptr = total <= 4 ? valuePtr : base + u32(valuePtr);
      if (ptr + total > dv.byteLength) return "";

      if (type === 2) return bytesToAscii(dv, ptr, count);
      if (type === 3) return count === 1 ? String(u16(ptr)) : Array.from({ length: count }, (_, i) => u16(ptr + i * 2)).join(", ");
      if (type === 4) return count === 1 ? String(u32(ptr)) : Array.from({ length: count }, (_, i) => u32(ptr + i * 4)).join(", ");
      if (type === 9) return count === 1 ? String(i32(ptr)) : Array.from({ length: count }, (_, i) => i32(ptr + i * 4)).join(", ");
      if (type === 5) return Array.from({ length: count }, (_, i) => {
        const p = ptr + i * 8;
        return safeDiv(u32(p), u32(p + 4));
      }).join(", ");
      if (type === 10) return Array.from({ length: count }, (_, i) => {
        const p = ptr + i * 8;
        return safeDiv(i32(p), i32(p + 4));
      }).join(", ");
      if (type === 1 || type === 7) return count === 1 ? String(dv.getUint8(ptr)) : Array.from({ length: count }, (_, i) => dv.getUint8(ptr + i)).join(", ");
      return "";
    }

    function readIfd(offset, scope) {
      if (!offset || offset + 2 > dv.byteLength) return;
      const count = u16(offset);
      for (let i = 0; i < count; i++) {
        const e = offset + 2 + i * 12;
        if (e + 12 > dv.byteLength) break;

        const tag = u16(e);
        const type = u16(e + 2);
        const n = u32(e + 4);
        const valuePtr = e + 8;

        if (scope === "IFD0" && tag === 0x8769) { readIfd(base + u32(valuePtr), "EXIF"); continue; }
        if (scope === "IFD0" && tag === 0x8825) { readIfd(base + u32(valuePtr), "GPS"); continue; }

        const key = TAGS[tag] || (scope + "_0x" + tag.toString(16).toUpperCase().padStart(4, "0"));
        const val = readVal(type, n, valuePtr);
        if (val !== "") out[key] = val;
      }
    }

    readIfd(ifd0, "IFD0");

    if (out.GPSLatitude && out.GPSLongitude) {
      const a = out.GPSLatitude.split(",").map((x) => parseFloat(x.trim()));
      const b = out.GPSLongitude.split(",").map((x) => parseFloat(x.trim()));
      if (a.length >= 3 && b.length >= 3) {
        let lat = a[0] + a[1] / 60 + a[2] / 3600;
        let lon = b[0] + b[1] / 60 + b[2] / 3600;
        if (String(out.GPSLatitudeRef).trim().toUpperCase() === "S") lat *= -1;
        if (String(out.GPSLongitudeRef).trim().toUpperCase() === "W") lon *= -1;
        out.GPSDecimal = lat.toFixed(6) + ", " + lon.toFixed(6);
      }
    }

    return out;
  }

  function parseJpegExif(dv) {
    let offset = 2;
    while (offset + 4 <= dv.byteLength) {
      if (dv.getUint8(offset) !== 0xff) break;
      const marker = dv.getUint8(offset + 1);
      if (marker === 0xda || marker === 0xd9) break;
      const len = dv.getUint16(offset + 2);
      if (len < 2) break;
      if (marker === 0xe1 && offset + 4 + len <= dv.byteLength) {
        const sig = bytesToAscii(dv, offset + 4, 6);
        if (sig === "Exif\u0000\u0000") return parseTiff(dv, offset + 10);
      }
      offset += len + 2;
    }
    return {};
  }

  function parsePngExif(dv) {
    if (dv.byteLength < 24) return {};
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) if (dv.getUint8(i) !== pngSig[i]) return {};

    let off = 8;
    while (off + 12 <= dv.byteLength) {
      const len = dv.getUint32(off, false);
      const type = bytesToAscii(dv, off + 4, 4);
      const data = off + 8;
      if (type === "eXIf" && data + len <= dv.byteLength) return parseTiff(dv, data);
      off += 12 + len;
    }
    return {};
  }

  function parseExif(buffer) {
    const dv = new DataView(buffer);
    if (dv.byteLength < 4) return {};
    if (dv.getUint16(0) === 0xffd8) return parseJpegExif(dv);
    if (dv.getUint32(0, false) === 0x89504e47) return parsePngExif(dv);
    return {};
  }

  function decodeUtf8(bytes) {
    try { return new TextDecoder("utf-8", { fatal: false }).decode(bytes); }
    catch { return ""; }
  }

  function extractRawMetadata(buffer) {
    const u8 = new Uint8Array(buffer);
    const ascii = Array.from(u8, (b) => (b >= 32 && b <= 126) ? String.fromCharCode(b) : " ").join("");

    const out = {};

    const xmpStart = ascii.indexOf("<x:xmpmeta");
    const xmpEnd = ascii.indexOf("</x:xmpmeta>");
    if (xmpStart >= 0 && xmpEnd > xmpStart) {
      out.XMP = ascii.slice(xmpStart, xmpEnd + 12).replace(/\s+/g, " ").trim();
    }

    const photoshop = ascii.indexOf("Photoshop 3.0");
    if (photoshop >= 0) {
      out.IPTC = ascii.slice(photoshop, Math.min(ascii.length, photoshop + 1200)).replace(/\s+/g, " ").trim();
    }

    const keywords = ["DateTimeOriginal", "Make", "Model", "Lens", "Exposure", "ISO", "GPS", "Copyright", "Artist", "Software"];
    const snippets = [];
    for (const key of keywords) {
      const i = ascii.indexOf(key);
      if (i >= 0) snippets.push(ascii.slice(Math.max(0, i - 40), Math.min(ascii.length, i + 140)).replace(/\s+/g, " ").trim());
    }
    if (snippets.length) out.TextSnippets = snippets.slice(0, 10).join(" | ");

    const utf = decodeUtf8(u8);
    if (utf && !out.XMP && utf.includes("xmp")) {
      const s = utf.indexOf("<x:xmpmeta");
      const e = utf.indexOf("</x:xmpmeta>");
      if (s >= 0 && e > s) out.XMP = utf.slice(s, e + 12).replace(/\s+/g, " ").trim();
    }

    return out;
  }

  function categorize(exif) {
    const grouped = {
      "File Information": {}, "Camera Settings": {}, "Date & Time": {},
      "GPS Data": {}, "Software & Processing": {}, "Other Data": {}
    };

    for (const [k, v] of Object.entries(exif)) {
      let placed = false;
      for (const [section, keys] of Object.entries(CATEGORIES)) {
        if (section === "Other Data") continue;
        if (keys.includes(k)) { grouped[section][k] = v; placed = true; break; }
      }
      if (!placed) grouped["Other Data"][k] = v;
    }
    return grouped;
  }

  function formatByteSize(bytes) {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return bytes.toLocaleString() + " Bytes / " + kb.toFixed(1) + "KB / " + mb.toFixed(2) + "MB";
  }

  function aspectRatio(width, height) {
    if (!width || !height) return "Unknown";
    const ratio = width / height;
    const known = [
      { r: 16 / 9, v: "16 / 9" }, { r: 4 / 3, v: "4 / 3" }, { r: 3 / 2, v: "3 / 2" },
      { r: 1, v: "1 / 1" }, { r: 5 / 4, v: "5 / 4" }, { r: 21 / 9, v: "21 / 9" },
      { r: 9 / 16, v: "9 / 16" }, { r: 3 / 4, v: "3 / 4" }, { r: 2 / 3, v: "2 / 3" }
    ];
    for (const k of known) if (Math.abs(ratio - k.r) / k.r < 0.03) return k.v;
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(Math.round(width), Math.round(height));
    return (Math.round(width) / g) + " / " + (Math.round(height) / g);
  }

  function mapExifToolGroups(record) {
    const skip = new Set(["SourceFile", "ExifToolVersion", "FileName", "Directory", "FileAccessDate", "FileInodeChangeDate", "FilePermissions"]);
    const grouped = {
      "File Information": {},
      "Image Properties": {},
      "Camera Settings": {},
      "GPS Data": {},
      "Date & Time": {},
      "Software & Processing": {},
      "Metadata & Description": {},
      "Technical Details": {},
      "Other Data": {}
    };

    if (record.ImageWidth && record.ImageHeight) {
      const w = Number(record.ImageWidth);
      const h = Number(record.ImageHeight);
      if (w > 0 && h > 0) grouped["Image Properties"]["Aspect Ratio"] = aspectRatio(w, h);
    }

    for (const [k, rawV] of Object.entries(record)) {
      if (skip.has(k) || rawV == null || rawV === "") continue;

      let v = Array.isArray(rawV) ? rawV.join(", ") : String(rawV);
      if (k === "FileSize" && typeof rawV === "number") v = formatByteSize(rawV);

      if (k.includes("GPS") || k.includes("Geo")) grouped["GPS Data"][k] = v;
      else if (k.includes("Date") || k.includes("Time") || k.includes("Timestamp")) grouped["Date & Time"][k] = v;
      else if (k.includes("Make") || k.includes("Model") || k.includes("Lens") || k.includes("Focal") || k.includes("Aperture") || k.includes("FNumber") || k.includes("Exposure") || k.includes("ISO") || k.includes("Flash") || k.includes("WhiteBalance") || k.includes("MeteringMode") || k.includes("Focus")) grouped["Camera Settings"][k] = v;
      else if (k.includes("Width") || k.includes("Height") || k.includes("Resolution") || k.includes("ColorSpace") || k.includes("Compression") || k.includes("Format") || k.includes("BitDepth") || k.includes("BitsPerSample") || k.includes("Orientation")) grouped["Image Properties"][k] = v;
      else if (k.includes("Software") || k.includes("Program") || k.includes("Creator") || k.includes("Tool") || k.includes("Version") || k.includes("Processing")) grouped["Software & Processing"][k] = v;
      else if (k.includes("Title") || k.includes("Subject") || k.includes("Description") || k.includes("Comment") || k.includes("Keywords") || k.includes("Tag") || k.includes("Author") || k.includes("Artist") || k.includes("Copyright") || k.includes("Credit") || k.includes("Source") || k.includes("Rating")) grouped["Metadata & Description"][k] = v;
      else if (k.includes("File") && (k.includes("Size") || k.includes("Type") || k.includes("Name"))) grouped["File Information"][k] = v;
      else if (k.includes("EXIF") || k.includes("Thumbnail") || k.includes("Profile") || k.includes("Channel") || k.includes("Component") || k.includes("SubIFD") || k.includes("Offset") || k.includes("Length") || k.includes("Count")) grouped["Technical Details"][k] = v;
      else grouped["Other Data"][k] = v;
    }

    return grouped;
  }

  async function fetchWasmWithFallback(init) {
    const candidates = [
      "../runner/exif_perl.wasm",
      "./runner/exif_perl.wasm",
      "/runner/exif_perl.wasm"
    ];

    for (const path of candidates) {
      try {
        const res = await fetch(path, init);
        if (res && res.ok) return res;
      } catch (_) {
        // try next candidate
      }
    }
    throw new Error("WASM file not found. Checked runner/ and wasm/ locations.");
  }

  async function parseWithWasm(file) {
    if (!window.ExifWasm || typeof window.ExifWasm.parseMetadata !== "function") return null;

    const result = await window.ExifWasm.parseMetadata(file, {
      args: ["-json", "-n"],
      transform: (text) => JSON.parse(text),
      fetch: async (resource, init) => {
        const url = typeof resource === "string" ? resource : (resource instanceof URL ? resource.toString() : "");
        if (url.includes("exif_perl") && url.includes(".wasm")) {
          return fetchWasmWithFallback(init);
        }
        return fetch(resource, init);
      }
    });

    if (!result || !result.success || !result.data) return null;
    return Array.isArray(result.data) ? (result.data[0] || null) : result.data;
  }

  function imageDims(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ url, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ url, w: "-", h: "-" });
      img.src = url;
    });
  }

  function renderRawSection(container, raw) {
    const entries = Object.entries(raw || {});
    if (!entries.length) return;
    const sec = sectionTpl.content.firstElementChild.cloneNode(true);
    sec.querySelector("summary").textContent = "Raw Metadata (XMP/IPTC/Text)";
    const grid = sec.querySelector(".section-grid");
    for (const [k, v] of entries) addRow(grid, k, String(v));
    container.appendChild(sec);
  }

  function renderSections(container, grouped, hasExif) {
    const order = [
      "File Information",
      "Image Properties",
      "Camera Settings",
      "Date & Time",
      "GPS Data",
      "Software & Processing",
      "Metadata & Description",
      "Technical Details",
      "Other Data"
    ];

    let rendered = 0;
    for (const name of order) {
      if (!grouped[name]) continue;
      const entries = Object.entries(grouped[name]);
      if (!entries.length) continue;

      const sec = sectionTpl.content.firstElementChild.cloneNode(true);
      sec.querySelector("summary").textContent = name + " (" + entries.length + ")";
      const grid = sec.querySelector(".section-grid");
      for (const [k, v] of entries) addRow(grid, k, String(v));

      const g = grouped["GPS Data"] || {};
      if (name === "GPS Data") {
        const lat = parseFloat(g.GPSLatitude);
        const lon = parseFloat(g.GPSLongitude);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          const mapLat = String(g.GPSLatitudeRef).toUpperCase() === "S" ? -lat : lat;
          const mapLon = String(g.GPSLongitudeRef).toUpperCase() === "W" ? -lon : lon;
          const rowK = document.createElement("div");
          const rowV = document.createElement("div");
          rowK.className = "k";
          rowV.className = "v";
          rowK.textContent = "View On Map";
          const a = document.createElement("a");
          a.className = "map-link";
          a.href = "https://maps.google.com/?q=" + encodeURIComponent(mapLat + "," + mapLon);
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = "Open Google Maps";
          rowV.appendChild(a);
          grid.append(rowK, rowV);
        } else if (g.GPSDecimal) {
          const [dLat, dLon] = String(g.GPSDecimal).split(",").map((x) => x.trim());
          const rowK = document.createElement("div");
          const rowV = document.createElement("div");
          rowK.className = "k";
          rowV.className = "v";
          rowK.textContent = "View On Map";
          const a = document.createElement("a");
          a.className = "map-link";
          a.href = "https://maps.google.com/?q=" + encodeURIComponent(dLat + "," + dLon);
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = "Open Google Maps";
          rowV.appendChild(a);
          grid.append(rowK, rowV);
        }
      }

      container.appendChild(sec);
      rendered++;
    }

    if (!rendered) {
      const sec = sectionTpl.content.firstElementChild.cloneNode(true);
      sec.querySelector("summary").textContent = "Metadata Status";
      const grid = sec.querySelector(".section-grid");
      addRow(grid, "Result", hasExif ? "Metadata parsed, but no mapped tags found." : "No EXIF found in this file.");
      addRow(grid, "Tip", "Use original camera files. Many apps strip EXIF during export/share.");
      container.appendChild(sec);
    }
  }

  async function renderFile(file) {
    const dims = await imageDims(file);
    let grouped = null;
    let raw = {};
    let hasExif = false;
    let parserUsed = "JS fallback";

    try {
      const wasmData = await parseWithWasm(file);
      if (wasmData) {
        grouped = mapExifToolGroups(wasmData);
        hasExif = Object.values(grouped).some((x) => Object.keys(x).length > 0);
        parserUsed = "ExifTool";
      }
    } catch (_) {
      // fallback below
    }

    if (!grouped) {
      const buffer = await file.arrayBuffer();
      const exif = parseExif(buffer);
      raw = extractRawMetadata(buffer);
      grouped = categorize(exif);
      hasExif = Object.keys(exif).length > 0;
    }

    const card = cardTpl.content.firstElementChild.cloneNode(true);
    card.querySelector(".preview").src = dims.url;
    card.querySelector(".name").textContent = file.name;

    const basic = card.querySelector(".basic");
    addRow(basic, "Type", file.type || "(unknown)");
    addRow(basic, "Size", (file.size / 1024).toFixed(1) + " KB");
    addRow(basic, "Dimensions", dims.w + " x " + dims.h);
    addRow(basic, "Last Modified", new Date(file.lastModified).toLocaleString());
    addRow(basic, "Parser", parserUsed);

    const sectionsEl = card.querySelector(".sections");
    renderSections(sectionsEl, grouped, hasExif);
    renderRawSection(sectionsEl, raw);

    results.appendChild(card);
  }

  function looksLikeImage(file) {
    if ((file.type || "").startsWith("image/")) return true;
    const n = (file.name || "").toLowerCase();
    return /\.(jpg|jpeg|png|webp|heic|heif|tif|tiff|bmp|gif|avif|cr2|cr3|nef|arw|dng|orf|raf)$/i.test(n);
  }

  async function handleFiles(files) {
    results.innerHTML = "";
    const list = Array.from(files || []).filter(looksLikeImage);
    setLayoutState(list.length > 0);
    statusEl.textContent = list.length ? (list.length + " file(s) selected") : "No image files selected";

    if (list.length && window.ExifWasm && typeof window.ExifWasm.parseMetadata === "function") {
      statusEl.textContent += " - EXIF available";
    }

    for (const f of list) {
      try { await renderFile(f); }
      catch (err) {
        const card = cardTpl.content.firstElementChild.cloneNode(true);
        card.querySelector(".name").textContent = f.name;
        card.querySelector(".preview").remove();
        const basic = card.querySelector(".basic");
        addRow(basic, "Error", "Could not parse this file");
        addRow(basic, "Reason", (err && err.message) ? err.message : "Unknown parser error");
        results.appendChild(card);
      }
    }
  }

  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
  });
  input.addEventListener("change", () => handleFiles(input.files));

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("drag"); });
  });
  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); });
  });
  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) handleFiles(files);
  });

  expandAllBtn.addEventListener("click", () => {
    document.querySelectorAll(".section").forEach((d) => { d.open = true; });
  });
  collapseAllBtn.addEventListener("click", () => {
    document.querySelectorAll(".section").forEach((d) => { d.open = false; });
  });

  setLayoutState(false);
})();
