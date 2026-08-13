const STREET_WORD_MAP = {
    street: 'st', st: 'st',
    avenue: 'ave', ave: 'ave',
    boulevard: 'blvd', blvd: 'blvd',
    drive: 'dr', dr: 'dr',
    road: 'rd', rd: 'rd',
    lane: 'ln', ln: 'ln',
    court: 'ct', ct: 'ct',
    place: 'pl', pl: 'pl',
    circle: 'cir', cir: 'cir',
    terrace: 'ter', ter: 'ter',
    highway: 'hwy', hwy: 'hwy',
    parkway: 'pkwy', pkwy: 'pkwy',
    north: 'n', n: 'n',
    south: 's', s: 's',
    east: 'e', e: 'e',
    west: 'w', w: 'w'
};

export function normalizeNumber(number) {
    if (!number) return '';
    return String(number).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function normalizeStreet(street) {
    if (!street) return '';
    return String(street)
        .toLowerCase()
        .replace(/[.,#]/g, '')
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0)
        .map((word) => STREET_WORD_MAP[word] || word)
        .join(' ');
}
