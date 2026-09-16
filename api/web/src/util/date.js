const pad = (n) => String(n).padStart(2, '0');

export function fmtDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtDateTime(date) {
    const d = new Date(date);
    return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
