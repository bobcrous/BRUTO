import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://atnozmponplxkvjxtpoh.supabase.co";
const SUPABASE_KEY = "sb_publishable_BVHpKtkxDvEDPw6GiYbgzQ_S-t5tvKP";
const BUCKET = "bruto-fotos";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const TARGET_SIZE = 1.5 * 1024 * 1024;

const input = document.getElementById("photoInput");
const gallery = document.getElementById("gallery");
const note = document.querySelector(".note");
const status = document.createElement("div");
status.className = "upload-status";
input.insertAdjacentElement("afterend", status);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function setStatus(message, isError = false) {
    status.textContent = message;
    status.className = "upload-status" + (isError ? " error" : "");
}

function publicUrl(path) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function render() {
    gallery.innerHTML = "<div class=\"gallery-loading\">CARGANDO FOTOS...</div>";

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .list("", { limit: 100, offset: 0, sortBy: { column: "created_at", order: "desc" } });

    if (error) {
        gallery.innerHTML = "<div class=\"gallery-loading\">NO SE PUDIERON CARGAR LAS FOTOS.</div>";
        setStatus("ERROR DE SUPABASE: " + error.message, true);
        console.error("Supabase Storage error:", error);
        return;
    }

    gallery.innerHTML = "";
    const photos = (data || []).filter(file => file.name && !file.name.endsWith("/"));

    if (!photos.length) {
        gallery.innerHTML = "<div class=\"gallery-loading\">TODAVÍA NO HAY FOTOS. SUBÍ LA PRIMERA.</div>";
        return;
    }

    photos.forEach((file, i) => {
        const box = document.createElement("div");
        box.className = "photo";

        const img = document.createElement("img");
        img.src = publicUrl(file.name);
        img.alt = "Foto subida";
        img.loading = "lazy";

        const caption = document.createElement("small");
        caption.textContent = `foto #${photos.length - i}`;

        box.appendChild(img);
        box.appendChild(caption);
        gallery.appendChild(box);
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("El navegador no pudo comprimir la imagen.")), type, quality);
    });
}

async function compressImage(file) {
    // createImageBitmap preserves the browser's decoded image orientation when supported.
    let bitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
        bitmap = await createImageBitmap(file);
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // WebP gives a substantial size reduction for photographic images.
    // If the browser doesn't support it, fall back to JPEG.
    const webpTest = await canvasToBlob(canvas, "image/webp", 0.82);
    const webpSupported = webpTest && webpTest.type === "image/webp";
    const type = webpSupported ? "image/webp" : "image/jpeg";

    let quality = 0.82;
    let blob = webpSupported ? webpTest : await canvasToBlob(canvas, type, quality);

    // Reduce quality a little more if the result is still unusually large.
    while (blob.size > TARGET_SIZE && quality > 0.55) {
        quality -= 0.07;
        blob = await canvasToBlob(canvas, type, quality);
    }

    return {
        blob,
        width,
        height,
        type,
        quality
    };
}

input.addEventListener("change", async () => {
    const files = [...input.files];
    input.value = "";
    if (!files.length) return;

    const validFiles = files.filter(file => {
        if (!file.type.startsWith("image/")) {
            setStatus("Solo se pueden subir imágenes.", true);
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            setStatus(`${file.name} supera el límite de 8 MB.`, true);
            return false;
        }
        return true;
    });

    for (const file of validFiles) {
        try {
            setStatus(`COMPRIMIENDO ${file.name}...`);
            const compressed = await compressImage(file);
            const extension = compressed.type === "image/webp" ? "webp" : "jpg";
            const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

            const savedKB = Math.round((file.size - compressed.blob.size) / 1024);
            const compressedKB = Math.round(compressed.blob.size / 1024);
            setStatus(`SUBIENDO ${file.name} (${compressedKB} KB)...`);

            const { error } = await supabase.storage.from(BUCKET).upload(filename, compressed.blob, {
                cacheControl: "31536000",
                upsert: false,
                contentType: compressed.type
            });

            if (error) {
                console.error("Supabase upload error:", error);
                setStatus(`NO SE PUDO SUBIR ${file.name}: ${error.message}`, true);
                continue;
            }

            const originalMB = (file.size / 1024 / 1024).toFixed(2);
            const finalMB = (compressed.blob.size / 1024 / 1024).toFixed(2);
            setStatus(`FOTO SUBIDA. ${originalMB} MB → ${finalMB} MB (${savedKB > 0 ? savedKB + " KB ahorrados" : "optimizada"}).`);
        } catch (error) {
            console.error("Image compression error:", error);
            setStatus(`NO SE PUDO PROCESAR ${file.name}. Probá con JPG, PNG o WebP.`, true);
        }
    }

    await render();
    setStatus("LISTO. LA FOTO YA ES VISIBLE PARA TODOS.");
});

note.textContent = "Las fotos se comprimen automáticamente a WebP (máx. 1600 px) antes de guardarse en Supabase. Máximo 8 MB por foto original.";
setStatus("CONECTADO A SUPABASE. COMPRESIÓN ACTIVADA.");
render();
