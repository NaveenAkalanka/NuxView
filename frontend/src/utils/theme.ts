export const getFolderColor = (path: string, depth: number) => {
    // Base hues for each level
    const levelHues: Record<number, number> = {
        0: 200, // Depth 0: Blue
        1: 140, // Depth 1: Green
        2: 45,  // Depth 2: Amber/Yellow
        3: 280, // Depth 3+: Purple/Magenta
    };

    const hue = levelHues[Math.min(depth, 3)];

    // Hash path for sibling variation (Saturation and Lightness jitter)
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = path.charCodeAt(i) + ((hash << 5) - hash);
    }
    const saturation = 70 + (Math.abs(hash) % 20); // 70-90%
    const lightness = 50 + (Math.abs(hash) % 15);   // 50-65%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
