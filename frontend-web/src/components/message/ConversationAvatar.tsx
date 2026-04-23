interface ConversationAvatarProps {
    name: string;
    avatarUrl?: string | null;
    compositeAvatarUrls?: string[];
    fallbackAvatarUrl: string;
    sizeClassName?: string;
    className?: string;
    ringClassName?: string;
}

function normalizeCompositeAvatarUrls(urls: string[] | undefined): string[] {
    if (!Array.isArray(urls)) return [];

    const uniqueUrls: string[] = [];
    const seen = new Set<string>();

    for (const rawUrl of urls) {
        const url = rawUrl?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        uniqueUrls.push(url);
        if (uniqueUrls.length >= 4) break;
    }

    return uniqueUrls;
}

export default function ConversationAvatar({
    name,
    avatarUrl,
    compositeAvatarUrls,
    fallbackAvatarUrl,
    sizeClassName = "h-10 w-10",
    className = "",
    ringClassName = "",
}: ConversationAvatarProps) {
    const normalizedComposite =
        normalizeCompositeAvatarUrls(compositeAvatarUrls);
    const hasCompositeAvatar = !avatarUrl && normalizedComposite.length > 0;

    const containerClass = [
        "relative overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800",
        sizeClassName,
        ringClassName,
        className,
    ]
        .filter(Boolean)
        .join(" ");

    if (hasCompositeAvatar) {
        const cells = [...normalizedComposite];
        if (cells.length === 3) {
            cells.push("");
        }

        return (
            <div className={containerClass} aria-label={name}>
                <div className="grid h-full w-full grid-cols-2 grid-rows-2">
                    {cells.map((url, index) =>
                        url ? (
                            <img
                                key={`${url}-${index}`}
                                src={url}
                                alt={name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div
                                key={`empty-${index}`}
                                className="h-full w-full bg-gray-200 dark:bg-gray-700"
                            />
                        ),
                    )}
                </div>
            </div>
        );
    }

    return (
        <img
            src={avatarUrl || fallbackAvatarUrl}
            alt={name}
            className={`${containerClass} object-cover`}
        />
    );
}
