const API_URL = "http://localhost:8000";

export async function getMembers() {
    const res = await fetch(`${API_URL}/members`);
    if (!res.ok) throw new Error("Errore nel recupero membri");
    return res.json();
}

export async function getEvents() {
    const res = await fetch(`${API_URL}/events`);
    if (!res.ok) throw new Error("Errore nel recupero eventi");
    return res.json();
}

export async function createEvent(eventData: any) {
    const res = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new Error("Errore nella creazione evento");
    return res.json();
}

export async function deleteEvent(eventId: number) {
    const res = await fetch(`${API_URL}/events/${eventId}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Errore nell'eliminazione evento");
    return res.json();
}

export async function getShifts() {
    const res = await fetch(`${API_URL}/shifts`);
    if (!res.ok) throw new Error("Errore nel recupero turni");
    return res.json();
}

export async function previewShifts(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/shifts/preview`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error("Errore durante l'anteprima");
    return res.json();
}

export async function saveBatchShifts(shifts: any[]) {
    const res = await fetch(`${API_URL}/shifts/batch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(shifts),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Errore nel salvataggio");
    }
    return res.json();
}
