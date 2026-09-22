import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://atnozmponplxkvjxtpoh.supabase.co";
const SUPABASE_KEY = "sb_publishable_BVHpKtkxDvEDPw6GiYbgzQ_S-t5tvKP";
const BUCKET = "bruto-fotos";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

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
        setStatus(`SUBIENDO ${file.name}...`);
        const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const filename = `${Date.now()}-${crypto.randomUUID()}.${extension || "jpg"}`;

        const { error } = await supabase.storage.from(BUCKET).upload(filename, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

        if (error) {
            console.error("Supabase upload error:", error);
            setStatus(`NO SE PUDO SUBIR ${file.name}: ${error.message}`, true);
            continue;
        }
        setStatus("FOTO SUBIDA. ACTUALIZANDO GALERÍA...");
    }

    await render();
    setStatus("LISTO. LA FOTO YA ES VISIBLE PARA TODOS.");
});

note.textContent = "Las fotos se guardan en Supabase y quedan visibles para todos los visitantes. Máximo 8 MB por foto.";
setStatus("CONECTADO A SUPABASE.");
render();
