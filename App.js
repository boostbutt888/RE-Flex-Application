import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";

const TOTAL_ROUNDS = 3;
const TARGET_MIN_SECONDS = 1.8;
const TARGET_MAX_SECONDS = 5.2;
const TARGET_STEP_SECONDS = 0.5;
const COLOR_TILE_ROUNDS = 5;
const COLOR_TILE_COUNTDOWN_SECONDS = 5;
const COLOR_TILE_OPTIONS = [
  { name: "Red", value: "#D83A34", textColor: "#FFFFFF" },
  { name: "Blue", value: "#2F6FDB", textColor: "#FFFFFF" },
  { name: "Green", value: "#2E8B57", textColor: "#FFFFFF" },
  { name: "Yellow", value: "#F2C94C", textColor: "#1E2A24" }
];

function createTargetTime() {
  const minStep = Math.ceil(TARGET_MIN_SECONDS / TARGET_STEP_SECONDS);
  const maxStep = Math.floor(TARGET_MAX_SECONDS / TARGET_STEP_SECONDS);
  const step = minStep + Math.floor(Math.random() * (maxStep - minStep + 1));
  return Number((step * TARGET_STEP_SECONDS).toFixed(3));
}

function calculateScore(targetTime, releasedTime) {
  const difference = Math.abs(releasedTime - targetTime);
  return Math.max(0, Math.round(1000 - difference * 280));
}

function createButtonReleaseSummary(results) {
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const totalDifference = results.reduce((sum, result) => sum + result.difference, 0);
  const averageScore = Math.round(totalScore / TOTAL_ROUNDS);
  const averageDifference = totalDifference / TOTAL_ROUNDS;

  return {
    id: Date.now().toString(),
    averageScore,
    averageDifference,
    totalScore,
    achievedAt: new Date()
  };
}

function formatSeconds(value) {
  return value.toFixed(3);
}

function getNow() {
  return global.performance?.now?.() ?? Date.now();
}

function shuffleColors() {
  const colors = [...COLOR_TILE_OPTIONS];

  for (let index = colors.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [colors[index], colors[randomIndex]] = [colors[randomIndex], colors[index]];
  }

  return colors;
}

function createColorTarget() {
  return COLOR_TILE_OPTIONS[Math.floor(Math.random() * COLOR_TILE_OPTIONS.length)];
}

function calculateColorTileScore(reactionTime) {
  return Math.max(0, Math.round(1000 - reactionTime * 260));
}

function createColorTileSummary(results) {
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const totalTime = results.reduce((sum, result) => sum + result.reactionTime, 0);
  const averageScore = Math.round(totalScore / COLOR_TILE_ROUNDS);
  const averageTime = totalTime / COLOR_TILE_ROUNDS;

  return {
    id: Date.now().toString(),
    averageScore,
    averageTime,
    totalScore,
    achievedAt: new Date()
  };
}

function formatAchievedAt(date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getTimerPanelColor(elapsedTime, targetTime) {
  const distance = Math.abs(elapsedTime - targetTime);
  const closeness = Math.max(0, 1 - distance / 1.25);
  const greenBoost = Math.round(38 * closeness);
  const red = Math.round(224 - 74 * closeness);
  const green = Math.min(255, 238 + greenBoost);
  const blue = Math.round(224 - 94 * closeness);

  return `rgb(${red}, ${green}, ${blue})`;
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState("start");
  const [targetTime, setTargetTime] = useState(createTargetTime);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [buttonSessionSummary, setButtonSessionSummary] = useState(null);
  const [buttonTopScores, setButtonTopScores] = useState([]);
  const [colorTileStage, setColorTileStage] = useState("idle");
  const [colorCountdown, setColorCountdown] = useState(COLOR_TILE_COUNTDOWN_SECONDS);
  const [colorTiles, setColorTiles] = useState(shuffleColors);
  const [colorTarget, setColorTarget] = useState(createColorTarget);
  const [colorRound, setColorRound] = useState(0);
  const [colorResults, setColorResults] = useState([]);
  const [colorSessionSummary, setColorSessionSummary] = useState(null);
  const [colorTopScores, setColorTopScores] = useState([]);

  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const colorCountdownRef = useRef(null);
  const colorRoundStartRef = useRef(0);

  const roundNumber = Math.min(attempts.length + 1, TOTAL_ROUNDS);
  const timerPanelColor = getTimerPanelColor(elapsedTime, targetTime);
  const colorTargetPanelStyle =
    colorTileStage === "playing"
      ? {
          backgroundColor: colorTarget.value,
          borderColor: colorTarget.value
        }
      : null;
  const colorTargetTextStyle =
    colorTileStage === "playing" ? { color: colorTarget.textColor } : null;

  const currentButtonAverageScore = useMemo(() => {
    if (attempts.length === 0) {
      return 0;
    }

    const total = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    return Math.round(total / attempts.length);
  }, [attempts]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (colorCountdownRef.current) {
        clearInterval(colorCountdownRef.current);
      }
    };
  }, []);

  function startRound() {
    if (sessionComplete || isHolding) {
      return;
    }

    setElapsedTime(0);
    setLastResult(null);
    setIsHolding(true);
    startTimeRef.current = getNow();

    timerRef.current = setInterval(() => {
      const now = getNow();
      setElapsedTime((now - startTimeRef.current) / 1000);
    }, 16);
  }

  function finishRound() {
    if (!isHolding) {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const now = getNow();
    const releasedTime = Number(((now - startTimeRef.current) / 1000).toFixed(3));
    const difference = Number(Math.abs(releasedTime - targetTime).toFixed(3));
    const score = calculateScore(targetTime, releasedTime);
    const result = {
      id: Date.now().toString(),
      targetTime,
      releasedTime,
      difference,
      score
    };
    const nextAttempts = [...attempts, result];

    setElapsedTime(releasedTime);
    setAttempts(nextAttempts);
    setLastResult(result);
    setIsHolding(false);

    if (nextAttempts.length >= TOTAL_ROUNDS) {
      const summary = createButtonReleaseSummary(nextAttempts);
      setButtonSessionSummary(summary);
      setButtonTopScores((currentScores) =>
        [...currentScores, summary]
          .sort((first, second) => {
            if (second.averageScore !== first.averageScore) {
              return second.averageScore - first.averageScore;
            }

            return first.averageDifference - second.averageDifference;
          })
          .slice(0, 5)
      );
      setSessionComplete(true);
    } else {
      setTargetTime(createTargetTime());
    }
  }

  function resetSession() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setTargetTime(createTargetTime());
    setElapsedTime(0);
    setIsHolding(false);
    setAttempts([]);
    setLastResult(null);
    setButtonSessionSummary(null);
    setSessionComplete(false);
  }

  function resetColorTiles() {
    if (colorCountdownRef.current) {
      clearInterval(colorCountdownRef.current);
      colorCountdownRef.current = null;
    }

    setColorTileStage("idle");
    setColorCountdown(COLOR_TILE_COUNTDOWN_SECONDS);
    setColorTiles(shuffleColors());
    setColorTarget(createColorTarget());
    setColorRound(0);
    setColorResults([]);
    setColorSessionSummary(null);
    colorRoundStartRef.current = 0;
  }

  function openExerciseSelection() {
    resetSession();
    resetColorTiles();
    setActiveScreen("exerciseSelection");
  }

  function openButtonRelease() {
    resetSession();
    resetColorTiles();
    setActiveScreen("buttonRelease");
  }

  function openColorTiles() {
    resetSession();
    resetColorTiles();
    setActiveScreen("colorTiles");
  }

  function beginColorTileRound(roundIndex) {
    setColorTiles(shuffleColors());
    setColorTarget(createColorTarget());
    setColorRound(roundIndex);
    setColorTileStage("playing");
    colorRoundStartRef.current = getNow();
  }

  function startColorTilesCountdown() {
    resetColorTiles();
    setColorTileStage("countdown");
    setColorCountdown(COLOR_TILE_COUNTDOWN_SECONDS);

    colorCountdownRef.current = setInterval(() => {
      setColorCountdown((currentValue) => {
        if (currentValue <= 1) {
          clearInterval(colorCountdownRef.current);
          colorCountdownRef.current = null;
          beginColorTileRound(0);
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);
  }

  function handleColorTilePress(color) {
    if (colorTileStage !== "playing" || color.name !== colorTarget.name) {
      return;
    }

    const reactionTime = Number(((getNow() - colorRoundStartRef.current) / 1000).toFixed(3));
    const score = calculateColorTileScore(reactionTime);
    const nextResults = [
      ...colorResults,
      {
        id: Date.now().toString(),
        target: colorTarget.name,
        reactionTime,
        score
      }
    ];

    setColorResults(nextResults);

    if (nextResults.length >= COLOR_TILE_ROUNDS) {
      const summary = createColorTileSummary(nextResults);
      setColorSessionSummary(summary);
      setColorTopScores((currentScores) =>
        [...currentScores, summary]
          .sort((first, second) => {
            if (second.averageScore !== first.averageScore) {
              return second.averageScore - first.averageScore;
            }

            return first.averageTime - second.averageTime;
          })
          .slice(0, 5)
      );
      setColorTileStage("complete");
      return;
    }

    beginColorTileRound(colorRound + 1);
  }

  if (activeScreen === "start") {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAF7" />
        <View style={styles.startScreen}>
          <View style={styles.startBrandBlock}>
            <Text style={styles.startBrand}>RE:flex</Text>
            <Text style={styles.startTagline}>your body coordination app</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tap to start"
            onPress={openExerciseSelection}
            style={styles.startButton}
          >
            <Text style={styles.startButtonText}>Tap to Start</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (activeScreen === "exerciseSelection") {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAF7" />
        <View style={styles.selectionScreen}>
          <View style={styles.selectionHeader}>
            <Text style={styles.brand}>re:flex</Text>
            <Text style={styles.selectionTitle}>Choose Exercise</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start button release exercise"
            onPress={openButtonRelease}
            style={styles.exerciseOption}
          >
            <View style={styles.exerciseIcon}>
              <Text style={styles.exerciseIconText}>1</Text>
            </View>
            <View style={styles.exerciseCopy}>
              <Text style={styles.exerciseTitle}>Button Release</Text>
              <Text style={styles.exerciseSubtitle}>Release close to the target time</Text>
            </View>
            <Text style={styles.exerciseArrow}>›</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start colour tiles exercise"
            onPress={openColorTiles}
            style={styles.exerciseOption}
          >
            <View style={styles.exerciseIcon}>
              <Text style={styles.exerciseIconText}>2</Text>
            </View>
            <View style={styles.exerciseCopy}>
              <Text style={styles.exerciseTitle}>Colour Tiles</Text>
              <Text style={styles.exerciseSubtitle}>Tap the tile matching the target colour</Text>
            </View>
            <Text style={styles.exerciseArrow}>›</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (activeScreen === "colorTiles") {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAF7" />
        <View style={styles.content}>
          <View style={styles.gameHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to exercise selection"
              onPress={openExerciseSelection}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>‹ Back</Text>
            </Pressable>
            <View style={styles.gameTitleBlock}>
              <Text style={styles.brand}>re:flex</Text>
              <Text style={styles.subtitle}>Colour Tiles</Text>
            </View>
          </View>

          <View style={[styles.colorStatusPanel, colorTargetPanelStyle]}>
            <Text style={[styles.colorTargetLabel, colorTargetTextStyle]}>
              Target Display
            </Text>
            <Text style={[styles.colorTargetText, colorTargetTextStyle]}>
              {colorTileStage === "playing" ? colorTarget.name : "Ready"}
            </Text>
            <Text style={[styles.colorTargetHint, colorTargetTextStyle]}>
              Match this colour below
            </Text>
            <Text style={[styles.colorRoundText, colorTargetTextStyle]}>
              Round {Math.min(colorResults.length + 1, COLOR_TILE_ROUNDS)}/{COLOR_TILE_ROUNDS}
            </Text>
          </View>

          {colorTileStage === "idle" ? (
            <View style={styles.colorCenterPanel}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start colour tiles countdown"
                onPress={startColorTilesCountdown}
                style={styles.startButton}
              >
                <Text style={styles.startButtonText}>Start</Text>
              </Pressable>
            </View>
          ) : null}

          {colorTileStage === "countdown" ? (
            <View style={styles.colorCenterPanel}>
              <Text style={styles.countdownNumber}>{colorCountdown}</Text>
            </View>
          ) : null}

          {colorTileStage === "playing" ? (
            <View style={styles.tileGrid}>
              {colorTiles.map((color) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${color.name} tile`}
                  key={color.name}
                  onPress={() => handleColorTilePress(color)}
                  style={[styles.colorTile, { backgroundColor: color.value }]}
                >
                  <Text style={styles.colorTileText}>{color.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {colorTileStage === "complete" ? (
            <View style={styles.colorFinalPanel}>
              <Text style={styles.colorFinalLabel}>5-Tap Average</Text>
              <Text style={styles.colorFinalScore}>
                {colorSessionSummary?.averageScore ?? 0}
              </Text>
              <View style={styles.colorResultStats}>
                <View style={styles.colorResultStat}>
                  <Text style={styles.colorResultLabel}>Avg Time</Text>
                  <Text style={styles.colorResultValue}>
                    {formatSeconds(colorSessionSummary?.averageTime ?? 0)}s
                  </Text>
                </View>
                <View style={styles.colorResultStat}>
                  <Text style={styles.colorResultLabel}>Score</Text>
                  <Text style={styles.colorResultValue}>
                    {colorSessionSummary?.totalScore ?? 0}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Restart colour tiles"
                onPress={startColorTilesCountdown}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Restart</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.topScoresPanel}>
            <Text style={styles.topScoresTitle}>Top 5 Scores</Text>
            {Array.from({ length: 5 }).map((_, index) => {
              const score = colorTopScores[index];

              return (
                <View key={score?.id ?? index.toString()} style={styles.topScoreRow}>
                  <Text style={styles.topScoreRank}>{index + 1}</Text>
                  <Text style={styles.topScoreMain}>
                    {score ? score.averageScore : "--"}
                  </Text>
                  <Text style={styles.topScoreMeta}>
                    {score ? formatAchievedAt(score.achievedAt) : "--"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAF7" />
      <View style={styles.content}>
        <View style={styles.gameHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to exercise selection"
            onPress={openExerciseSelection}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>
          <View style={styles.gameTitleBlock}>
            <Text style={styles.brand}>re:flex</Text>
            <Text style={styles.subtitle}>Button Release</Text>
          </View>
        </View>

        <View style={styles.targetPanel}>
          <View>
            <Text style={styles.label}>Target</Text>
            <Text style={styles.targetValue}>{formatSeconds(targetTime)}s</Text>
          </View>
          <View style={styles.roundBadge}>
            <Text style={styles.roundText}>
              Try {roundNumber}
            </Text>
            <Text style={styles.roundSubText}>
              of {TOTAL_ROUNDS}
            </Text>
          </View>
        </View>

        <View style={[styles.timerPanel, { backgroundColor: timerPanelColor }]}>
          <Text style={styles.label}>{isHolding ? "Release near target" : "Timer"}</Text>
          <Text
            style={[
              styles.timerValue,
              elapsedTime > targetTime && isHolding ? styles.timerOver : null
            ]}
          >
            {formatSeconds(elapsedTime)}s
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            sessionComplete ? "Try button release again" : "Hold and release reflex button"
          }
          onPress={sessionComplete ? resetSession : undefined}
          onPressIn={sessionComplete ? undefined : startRound}
          onPressOut={sessionComplete ? undefined : finishRound}
          style={({ pressed }) => [
            styles.gameButton,
            isHolding || pressed ? styles.gameButtonActive : styles.gameButtonIdle,
            sessionComplete ? styles.gameButtonDisabled : null
          ]}
        >
          <Text style={styles.gameButtonText}>
            {sessionComplete ? "TRY AGAIN" : isHolding ? "Release" : "Hold"}
          </Text>
        </Pressable>

        {lastResult ? (
          <View style={styles.resultPanel}>
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.label}>Released</Text>
                <Text style={styles.resultValue}>
                  {formatSeconds(lastResult.releasedTime)}s
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.label}>Missed by</Text>
                <Text style={styles.resultValue}>
                  {formatSeconds(lastResult.difference)}s
                </Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.label}>Score</Text>
                <Text style={styles.resultValue}>{lastResult.score}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {sessionComplete ? (
          <View style={styles.buttonFinalPanel}>
            <View>
              <Text style={styles.buttonFinalLabel}>3-Try Average</Text>
              <Text style={styles.buttonFinalScore}>
                {buttonSessionSummary?.averageScore ?? 0}
              </Text>
            </View>
            <View style={styles.buttonFinalActions}>
              <Text style={styles.buttonFinalMeta}>
                Avg miss {formatSeconds(buttonSessionSummary?.averageDifference ?? 0)}s
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start a new session"
                onPress={resetSession}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Restart</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.scorePanel}>
            <View>
              <Text style={styles.label}>Current Average</Text>
              <Text style={styles.averageValue}>{currentButtonAverageScore}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new session"
              onPress={resetSession}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Restart</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.topScoresPanel}>
          <Text style={styles.topScoresTitle}>Top 5 Scores</Text>
          {Array.from({ length: 5 }).map((_, index) => {
            const score = buttonTopScores[index];

            return (
              <View key={score?.id ?? index.toString()} style={styles.topScoreRow}>
                <Text style={styles.topScoreRank}>{index + 1}</Text>
                <Text style={styles.topScoreMain}>
                  {score ? score.averageScore : "--"}
                </Text>
                <Text style={styles.topScoreMeta}>
                  {score ? formatAchievedAt(score.achievedAt) : "--"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAF7"
  },
  startScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingBottom: 44,
    paddingTop: 118
  },
  startBrandBlock: {
    alignItems: "center",
    gap: 10
  },
  startBrand: {
    color: "#1E2A24",
    fontSize: 58,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center"
  },
  startTagline: {
    color: "#4D5B53",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 29,
    textAlign: "center"
  },
  startButton: {
    alignItems: "center",
    backgroundColor: "#24352B",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 66,
    width: "100%"
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0
  },
  selectionScreen: {
    flex: 1,
    gap: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  selectionHeader: {
    gap: 6
  },
  selectionTitle: {
    color: "#24352B",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0
  },
  exerciseOption: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5DE",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 96,
    paddingHorizontal: 16
  },
  exerciseIcon: {
    alignItems: "center",
    backgroundColor: "#E7F0EA",
    borderRadius: 8,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  exerciseIconText: {
    color: "#24352B",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0
  },
  exerciseCopy: {
    flex: 1,
    gap: 3
  },
  exerciseTitle: {
    color: "#1E2A24",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0
  },
  exerciseSubtitle: {
    color: "#5A675F",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 20
  },
  exerciseArrow: {
    color: "#5A675F",
    fontSize: 34,
    fontWeight: "500",
    letterSpacing: 0
  },
  content: {
    flex: 1,
    gap: 10,
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 10
  },
  gameHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  gameTitleBlock: {
    flex: 1
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "#E7F0EA",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 78,
    paddingHorizontal: 10
  },
  backButtonText: {
    color: "#24352B",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0
  },
  brand: {
    color: "#1E2A24",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0
  },
  subtitle: {
    color: "#4D5B53",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0
  },
  targetPanel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5DE",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  label: {
    color: "#5A675F",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0
  },
  targetValue: {
    color: "#1E2A24",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 1
  },
  roundBadge: {
    alignItems: "center",
    backgroundColor: "#E7F0EA",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 64,
    paddingHorizontal: 12
  },
  roundText: {
    color: "#24352B",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0
  },
  roundSubText: {
    color: "#5A675F",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0
  },
  timerPanel: {
    alignItems: "center",
    backgroundColor: "#EEF3F0",
    borderRadius: 8,
    gap: 2,
    minHeight: 94,
    justifyContent: "center",
    padding: 12
  },
  timerValue: {
    color: "#1E2A24",
    fontSize: 44,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: 0
  },
  timerOver: {
    color: "#A2352A"
  },
  colorStatusPanel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5DE",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    minHeight: 106,
    justifyContent: "center",
    padding: 12
  },
  colorTargetLabel: {
    color: "#5A675F",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  colorTargetText: {
    color: "#1E2A24",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0
  },
  colorTargetHint: {
    color: "#5A675F",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0
  },
  colorRoundText: {
    color: "#5A675F",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0
  },
  colorCenterPanel: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 280
  },
  countdownNumber: {
    color: "#24352B",
    fontSize: 112,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center"
  },
  tileGrid: {
    alignSelf: "center",
    aspectRatio: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    maxWidth: 342,
    width: "100%"
  },
  colorTile: {
    alignItems: "center",
    borderRadius: 8,
    flexBasis: "48%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 150,
    shadowColor: "#1E2A24",
    shadowOffset: {
      width: 0,
      height: 5
    },
    shadowOpacity: 0.14,
    shadowRadius: 12
  },
  colorTileText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    textShadowColor: "rgba(0, 0, 0, 0.28)",
    textShadowOffset: {
      width: 0,
      height: 1
    },
    textShadowRadius: 2
  },
  colorFinalPanel: {
    alignItems: "center",
    backgroundColor: "#24352B",
    borderRadius: 8,
    gap: 8,
    justifyContent: "center",
    minHeight: 286,
    padding: 18
  },
  colorFinalLabel: {
    color: "#DCE5DE",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  colorFinalScore: {
    color: "#FFFFFF",
    fontSize: 62,
    fontWeight: "900",
    letterSpacing: 0
  },
  colorResultStats: {
    flexDirection: "row",
    gap: 10,
    width: "100%"
  },
  colorResultStat: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    flex: 1,
    minHeight: 62,
    justifyContent: "center",
    paddingHorizontal: 8
  },
  colorResultLabel: {
    color: "#DCE5DE",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
  },
  colorResultValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2
  },
  topScoresPanel: {
    gap: 6
  },
  topScoresTitle: {
    color: "#24352B",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0
  },
  topScoreRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5DE",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 36,
    paddingHorizontal: 12
  },
  topScoreRank: {
    color: "#5A675F",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
    width: 28
  },
  topScoreMain: {
    color: "#1E2A24",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0
  },
  topScoreMeta: {
    color: "#5A675F",
    flex: 2,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "right"
  },
  gameButton: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 160,
    elevation: 4,
    height: 194,
    justifyContent: "center",
    shadowColor: "#1E2A24",
    shadowOffset: {
      width: 0,
      height: 8
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 194
  },
  gameButtonIdle: {
    backgroundColor: "#C64032"
  },
  gameButtonActive: {
    backgroundColor: "#2E8B57"
  },
  gameButtonDisabled: {
    backgroundColor: "#7A827C",
    shadowOpacity: 0.08
  },
  gameButtonText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center"
  },
  resultPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5DE",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  resultGrid: {
    flexDirection: "row",
    gap: 8
  },
  resultItem: {
    backgroundColor: "#F4F7F5",
    borderRadius: 8,
    flex: 1,
    minHeight: 62,
    justifyContent: "center",
    paddingHorizontal: 8
  },
  resultValue: {
    color: "#1E2A24",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 1
  },
  scorePanel: {
    alignItems: "center",
    backgroundColor: "#24352B",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  averageValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 0
  },
  buttonFinalPanel: {
    alignItems: "center",
    backgroundColor: "#24352B",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  buttonFinalLabel: {
    color: "#DCE5DE",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  buttonFinalScore: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0
  },
  buttonFinalActions: {
    alignItems: "flex-end",
    gap: 6
  },
  buttonFinalMeta: {
    color: "#DCE5DE",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0
  },
  resetButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 104,
    paddingHorizontal: 16
  },
  resetButtonText: {
    color: "#24352B",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0
  },
  history: {
    gap: 6
  },
  historyRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5DE",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 38,
    paddingHorizontal: 12
  },
  historyRound: {
    color: "#1E2A24",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0
  },
  historyText: {
    color: "#4D5B53",
    flex: 1,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center"
  },
  historyScore: {
    color: "#1E2A24",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "right"
  }
});
