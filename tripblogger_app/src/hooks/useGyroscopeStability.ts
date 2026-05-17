import { useEffect, useRef, useState } from 'react';
import { Accelerometer, Gyroscope } from 'expo-sensors';

const STEADY_GYRO = 0.04;
const STEADY_MS = 250;
const LEVEL_ROLL_DEG = 2;

function magnitude3(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z);
}

function rollDegreesFromAccel(x: number, y: number, z: number) {
  return (Math.atan2(x, Math.sqrt(y * y + z * z)) * 180) / Math.PI;
}

export function useGyroscopeStability(enabled = true) {
  const [steady, setSteady] = useState(false);
  const [level, setLevel] = useState(false);
  const [rollDeg, setRollDeg] = useState(0);
  const steadySince = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSteady(false);
      setLevel(false);
      return;
    }

    Gyroscope.setUpdateInterval(50);
    Accelerometer.setUpdateInterval(50);

    const gyroSub = Gyroscope.addListener(({ x, y, z }) => {
      const mag = magnitude3(x, y, z);
      const now = Date.now();
      if (mag < STEADY_GYRO) {
        if (steadySince.current == null) steadySince.current = now;
        if (now - steadySince.current >= STEADY_MS) setSteady(true);
      } else {
        steadySince.current = null;
        setSteady(false);
      }
    });

    const accelSub = Accelerometer.addListener(({ x, y, z }) => {
      const roll = rollDegreesFromAccel(x, y, z);
      setRollDeg(roll);
      setLevel(Math.abs(roll) < LEVEL_ROLL_DEG);
    });

    return () => {
      gyroSub.remove();
      accelSub.remove();
    };
  }, [enabled]);

  return { steady, level, rollDeg };
}
