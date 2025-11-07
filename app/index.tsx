import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const GRID_SIZE = 20;
const CELL_SIZE = Math.floor((Dimensions.get('window').width - 40) / GRID_SIZE);
const GAME_SPEED = 150;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const COLORS = {
  background: '#0a0e27',
  grid: '#1a1f3a',
  snake: '#00ff88',
  snakeGlow: '#00ff8850',
  food: '#ff3366',
  foodGlow: '#ff336650',
  text: '#ffffff',
  textSecondary: '#8892b0',
  button: '#1e2749',
  buttonActive: '#2d3b6e',
  overlay: '#0a0e27ee',
};

export default function SnakeGame() {
  const insets = useSafeAreaInsets();
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foodScale = useRef(new Animated.Value(1)).current;
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);

  useEffect(() => {
    nextDirectionRef.current = nextDirection;
  }, [nextDirection]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    loadHighScore();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(foodScale, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(foodScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [foodScale]);

  const loadHighScore = async () => {
    try {
      const saved = await AsyncStorage.getItem('snakeHighScore');
      if (saved) {
        const savedScore = parseInt(saved, 10);
        setHighScore(savedScore);
        highScoreRef.current = savedScore;
      }
    } catch (error) {
      console.error('Failed to load high score:', error);
    }
  };

  const saveHighScore = async (newScore: number) => {
    try {
      await AsyncStorage.setItem('snakeHighScore', newScore.toString());
      setHighScore(newScore);
      highScoreRef.current = newScore;
    } catch (error) {
      console.error('Failed to save high score:', error);
    }
  };

  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (
      currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y)
    );
    return newFood;
  }, []);

  useEffect(() => {
    if (!isGameStarted || isGameOver || isPaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const moveSnake = () => {
      const currentNextDirection = nextDirectionRef.current;
      setDirection(currentNextDirection);

      setSnake((prevSnake) => {
        const head = prevSnake[0];
        let newHead: Position;

        switch (currentNextDirection) {
          case 'UP':
            newHead = { x: head.x, y: head.y - 1 };
            break;
          case 'DOWN':
            newHead = { x: head.x, y: head.y + 1 };
            break;
          case 'LEFT':
            newHead = { x: head.x - 1, y: head.y };
            break;
          case 'RIGHT':
            newHead = { x: head.x + 1, y: head.y };
            break;
        }

        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE ||
          prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
        ) {
          setIsGameOver(true);
          const currentScore = scoreRef.current;
          const currentHighScore = highScoreRef.current;
          if (currentScore > currentHighScore) {
            saveHighScore(currentScore);
          }
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        setFood((currentFood) => {
          if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
            setScore((s) => s + 10);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            return generateFood(newSnake);
          }
          return currentFood;
        });

        if (newHead.x === food.x && newHead.y === food.y) {
          return newSnake;
        }

        newSnake.pop();
        return newSnake;
      });
    };

    gameLoopRef.current = setInterval(moveSnake, GAME_SPEED);
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isGameStarted, isGameOver, isPaused, food, generateFood]);

  const handleDirectionChange = (newDirection: Direction) => {
    if (
      (newDirection === 'UP' && direction !== 'DOWN') ||
      (newDirection === 'DOWN' && direction !== 'UP') ||
      (newDirection === 'LEFT' && direction !== 'RIGHT') ||
      (newDirection === 'RIGHT' && direction !== 'LEFT')
    ) {
      setNextDirection(newDirection);
      nextDirectionRef.current = newDirection;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const startGame = () => {
    setIsGameStarted(true);
    setIsGameOver(false);
    setIsPaused(false);
    setScore(0);
    scoreRef.current = 0;
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 15 });
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    nextDirectionRef.current = 'RIGHT';
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const togglePause = () => {
    setIsPaused((p) => !p);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>BEST</Text>
          <Text style={styles.scoreValue}>{highScore}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View
          style={[
            styles.board,
            {
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
            },
          ]}
        >
          {snake.map((segment, index) => (
            <View
              key={`snake-${index}`}
              testID={`snake-segment-${index}`}
              style={[
                styles.snakeSegment,
                {
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  opacity: index === 0 ? 1 : 0.8 - index * 0.01,
                },
              ]}
            />
          ))}

          <Animated.View
            testID="food"
            style={[
              styles.food,
              {
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                transform: [{ scale: foodScale }],
              },
            ]}
          />
        </View>

        {!isGameStarted && (
          <View style={styles.overlay}>
            <Text style={styles.title}>SNAKE</Text>
            <Text style={styles.subtitle}>XENZIA</Text>
            <TouchableOpacity 
              testID="start-button"
              style={styles.startButton} 
              onPress={startGame}
            >
              <Text style={styles.startButtonText}>START GAME</Text>
            </TouchableOpacity>
            <Text style={styles.instructions}>Use arrows to control</Text>
          </View>
        )}

        {isGameOver && (
          <View style={styles.overlay}>
            <Text style={styles.gameOverText}>GAME OVER</Text>
            <Text style={styles.finalScore}>Score: {score}</Text>
            {score === highScore && score > 0 && (
              <Text style={styles.newRecord}>🏆 NEW RECORD!</Text>
            )}
            <TouchableOpacity 
              testID="restart-button"
              style={styles.restartButton} 
              onPress={startGame}
            >
              <RotateCcw color={COLORS.text} size={20} />
              <Text style={styles.restartButtonText}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPaused && !isGameOver && (
          <View style={styles.overlay}>
            <Text style={styles.pausedText}>PAUSED</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {isGameStarted && !isGameOver && (
          <TouchableOpacity
            testID="pause-button"
            style={[styles.pauseButton, isPaused && styles.pauseButtonActive]}
            onPress={togglePause}
          >
            {isPaused ? (
              <Play color={COLORS.text} size={24} fill={COLORS.text} />
            ) : (
              <Pause color={COLORS.text} size={24} fill={COLORS.text} />
            )}
          </TouchableOpacity>
        )}

        {isGameStarted && (
          <View style={styles.dpad}>
            <View style={styles.dpadRow}>
              <View style={styles.dpadSpacer} />
              <TouchableOpacity
                testID="button-up"
                style={styles.dpadButton}
                onPress={() => handleDirectionChange('UP')}
              >
                <ArrowUp color={COLORS.text} size={28} />
              </TouchableOpacity>
              <View style={styles.dpadSpacer} />
            </View>
            <View style={styles.dpadRow}>
              <TouchableOpacity
                testID="button-left"
                style={styles.dpadButton}
                onPress={() => handleDirectionChange('LEFT')}
              >
                <ArrowLeft color={COLORS.text} size={28} />
              </TouchableOpacity>
              <View style={styles.dpadCenter} />
              <TouchableOpacity
                testID="button-right"
                style={styles.dpadButton}
                onPress={() => handleDirectionChange('RIGHT')}
              >
                <ArrowRight color={COLORS.text} size={28} />
              </TouchableOpacity>
            </View>
            <View style={styles.dpadRow}>
              <View style={styles.dpadSpacer} />
              <TouchableOpacity
                testID="button-down"
                style={styles.dpadButton}
                onPress={() => handleDirectionChange('DOWN')}
              >
                <ArrowDown color={COLORS.text} size={28} />
              </TouchableOpacity>
              <View style={styles.dpadSpacer} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginTop: 4,
  },
  gameContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    backgroundColor: COLORS.grid,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  snakeSegment: {
    position: 'absolute',
    backgroundColor: COLORS.snake,
    shadowColor: COLORS.snakeGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  food: {
    position: 'absolute',
    backgroundColor: COLORS.food,
    borderRadius: 100,
    shadowColor: COLORS.foodGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  overlay: {
    position: 'absolute',
    width: GRID_SIZE * CELL_SIZE,
    height: GRID_SIZE * CELL_SIZE,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  title: {
    fontSize: 48,
    fontWeight: '900' as const,
    color: COLORS.snake,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
    letterSpacing: 8,
    marginTop: -8,
  },
  startButton: {
    backgroundColor: COLORS.snake,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 40,
    shadowColor: COLORS.snakeGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.background,
    letterSpacing: 1,
  },
  instructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 24,
  },
  gameOverText: {
    fontSize: 40,
    fontWeight: '900' as const,
    color: COLORS.food,
    letterSpacing: 2,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginTop: 16,
  },
  newRecord: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.snake,
    marginTop: 12,
  },
  restartButton: {
    backgroundColor: COLORS.button,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restartButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.text,
    letterSpacing: 1,
  },
  pausedText: {
    fontSize: 40,
    fontWeight: '900' as const,
    color: COLORS.text,
    letterSpacing: 4,
  },
  controls: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  pauseButton: {
    backgroundColor: COLORS.button,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButtonActive: {
    backgroundColor: COLORS.buttonActive,
  },
  dpad: {
    gap: 8,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dpadButton: {
    backgroundColor: COLORS.button,
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenter: {
    width: 70,
    height: 70,
  },
  dpadSpacer: {
    width: 70,
    height: 70,
  },
});
