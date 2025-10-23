import { motion } from 'motion/react';
import { useEffect } from 'react';
import BlurText from './BlurText';

export default function WelcomeOverlay({
    visible = false,
    text = 'Welcome to Gossiply',
    onDone = () => {},
    holdAfterTextMs = 600,
}) {
    useEffect(() => {
        if (!visible) return;
        const kill = setTimeout(onDone, 5000);
        return () => clearTimeout(kill);
    }, [visible, onDone]);

    if (!visible) return null;

    return (
        <motion.div
            className="welcome-veil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
        >
            <BlurText
                text={text}
                animateBy="words"
                delay={120}
                stepDuration={0.35}
                direction="top"
                className="welcome-veil__title"
                onAnimationComplete={() => setTimeout(onDone, holdAfterTextMs)}
            />
        </motion.div>
    );
}
