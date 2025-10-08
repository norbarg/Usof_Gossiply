// frontend/src/shared/components/WelcomeOverlay.jsx
import { motion } from 'motion/react';
import { useEffect } from 'react';
import BlurText from './BlurText'; // положи твой BlurText сюда: shared/components/BlurText.jsx

export default function WelcomeOverlay({
    visible = false,
    text = 'Welcome to Gossiply',
    onDone = () => {},
    holdAfterTextMs = 600, // сколько подержать после завершения анимации текста
}) {
    useEffect(() => {
        if (!visible) return;
        // страховка на случай, если onAnimationComplete не сработает
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
                delay={120} // шаг задержки между словами (мс)
                stepDuration={0.35} // длительность каждого шага анимации
                direction="top"
                className="welcome-veil__title"
                onAnimationComplete={() => setTimeout(onDone, holdAfterTextMs)}
            />
        </motion.div>
    );
}
