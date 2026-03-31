/**
 * Formats a large number to a short string (e.g. 1234 -> "1.2K", 1234567 -> "1.2M").
 */
export function formatCount(count: number): string {
    if (count >= 1_000_000) {
        return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (count >= 1_000) {
        return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return count.toString();
}
