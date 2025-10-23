// простий реєстр підписників по postId
import { randomUUID } from 'crypto';

const subscribers = new Map(); // Map<postId, Map<clientId, res>>

export function subscribeToComments(postId, res) {
    const key = String(postId);
    if (!subscribers.has(key)) subscribers.set(key, new Map());
    const id = randomUUID();
    subscribers.get(key).set(id, res);
    return () => {
        const m = subscribers.get(key);
        if (!m) return;
        m.delete(id);
        if (m.size === 0) subscribers.delete(key);
    };
}

export function broadcastCommentEvent(postId, payload) {
    const m = subscribers.get(String(postId));
    if (!m || m.size === 0) return;
    const line = `data: ${JSON.stringify(payload)}\n\n`;
    for (const [, res] of m) res.write(line);
}
