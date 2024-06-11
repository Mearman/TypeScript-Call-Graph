export function recordToMap<K extends string, V>(record: Record<K, V>): Map<K, V> {
    return new Map(Object.entries(record)) as Map<K, V>;
}

export function mapToRecord<K extends string, V>(map: Map<K, V>): Record<K, V> {
    return Object.fromEntries(map.entries()) as Record<K, V>;
}
