import React from 'react';
import Particles from './Particles';

export default function AuthBackground() {
    return (
        <div className="auth-bg">
            <Particles
                className="auth-bg__particles"
                particleColors={['#ffffff', '#ffffff']}
                particleCount={200}
                particleSpread={10}
                speed={0.1}
                particleBaseSize={100}
                moveParticlesOnHover={false} // выключаем взаимодействие с мышью
                alphaParticles={false}
                disableRotation={true} // выключаем вращение
            />
            <div className="auth-bg__gradient" />
        </div>
    );
}
